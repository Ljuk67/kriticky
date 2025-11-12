<?php
// Accepts JSON { slug, name, email, message, hp_field? }
// - Creates a pending comment in Supabase with verify_token and expiry
// - Sends a verification email with a link to /api/comments/verify.php?token=...
// Response: 200 { ok: true } on success (always generic to avoid info leaks)

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
// Allow same-origin; adjust if needed
if (isset($_SERVER['HTTP_ORIGIN'])) {
  header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
}

// Basic CORS for same-origin usage
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  header('Access-Control-Allow-Origin: ' . (isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*'));
  header('Access-Control-Allow-Methods: POST, OPTIONS');
  header('Access-Control-Allow-Headers: Content-Type');
  http_response_code(204); exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'Method Not Allowed']);
  exit;
}

function envv(string $k, ?string $d=null): ?string { $v = getenv($k); return $v === false ? $d : $v; }

// Simple JSON body reader
$raw = file_get_contents('php://input');
if (!$raw) { $raw = ''; }
$data = json_decode($raw, true);
if (!is_array($data)) { $data = []; }

// Honeypot & simple rate-limit per IP (1 per 60s)
$ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$hp = trim((string)($data['hp_field'] ?? ''));
if ($hp !== '') { echo json_encode(['ok' => true]); exit; }

try {
  $limKey = 'comments_submit_' . preg_replace('/[^a-zA-Z0-9_.-]/', '_', $ip);
  $limFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . $limKey;
  $now = time();
  if (file_exists($limFile)) {
    $last = (int)@file_get_contents($limFile);
    if ($now - $last < 60) {
      echo json_encode(['ok' => true]);
      exit;
    }
  }
  @file_put_contents($limFile, (string)$now);
} catch (Throwable $e) {}

// Validate inputs
$slug = trim((string)($data['slug'] ?? ''));
$name = trim((string)($data['name'] ?? ''));
$email = trim((string)($data['email'] ?? ''));
$message = trim((string)($data['message'] ?? ''));

if ($slug === '' || $name === '' || $email === '' || $message === '') {
  echo json_encode(['ok' => true]);
  exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  echo json_encode(['ok' => true]);
  exit;
}
if (mb_strlen($message) < 3) { echo json_encode(['ok' => true]); exit; }

// Supabase config (prefer config.local.php; fallback to env)
require_once __DIR__ . '/../lib/config.php';
$sbUrl = rtrim((string)cfg('SUPABASE_URL', ''), '/');
$sbServiceKey = (string)cfg('SUPABASE_SERVICE_ROLE_KEY', '');
if ($sbUrl === '' || $sbServiceKey === '') {
  // Log for later inspection
  require_once __DIR__ . '/../lib/logger.php';
  app_log('supabase_not_configured');
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'not_configured']);
  exit;
}

// Prepare verification
function base64url(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
$token = base64url(random_bytes(24));
$expires = (new DateTimeImmutable('+48 hours'))->format(DateTime::ATOM);

// Insert pending comment via PostgREST
$payload = [
  'slug' => $slug,
  'name' => $name,
  'email' => $email,
  'message' => $message,
  'is_approved' => false,
  'verify_token' => $token,
  'verify_expires_at' => $expires,
];

function sb_request(string $method, string $url, string $serviceKey, array $body=null, array $headers=[]): array {
  $ch = curl_init($url);
  $h = array_merge([
    'apikey: ' . $serviceKey,
    'Authorization: Bearer ' . $serviceKey,
    'Content-Type: application/json',
    'Accept: application/json',
  ], $headers);
  curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
  if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
  curl_setopt($ch, CURLOPT_HTTPHEADER, $h);
  curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
  curl_setopt($ch, CURLOPT_TIMEOUT, 10);
  $resBody = curl_exec($ch);
  $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
  $err = curl_error($ch);
  curl_close($ch);
  return [$status, $resBody, $err];
}

[$st, $body, $err] = sb_request('POST', $sbUrl . '/rest/v1/comments', $sbServiceKey, $payload, ['Prefer: return=representation']);
if ($st < 200 || $st >= 300) {
  // Log and report failure to the client so UI shows error
  error_log('comments submit: supabase insert failed status=' . $st . ' err=' . $err . ' body=' . $body);
  require_once __DIR__ . '/../lib/logger.php';
  $masked = preg_replace('/(^.).*(@.*$)/', '$1***$2', $email);
  app_log('supabase_insert_failed', [
    'slug' => $slug,
    'to' => $masked,
    'status' => $st,
    'err' => substr((string)$err, 0, 200),
    'body' => substr((string)$body, 0, 200),
  ]);
  // Try to classify common errors without leaking details
  $code = 'insert_failed';
  $snippet = strtolower((string)$body);
  if (strpos($snippet, 'verify_token') !== false || strpos($snippet, 'verify_expires_at') !== false) {
    $code = 'missing_verify_columns';
  }
  http_response_code(502);
  echo json_encode(['ok' => false, 'error' => $code]);
  exit;
}

// Build verification link
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'localhost';
$base = $scheme . '://' . $host;
$verifyUrl = $base . '/api/comments/verify.php?token=' . urlencode($token);

// Send verification email to commenter
require_once __DIR__ . '/../lib/smtp.php';
require_once __DIR__ . '/../lib/logger.php';

$to = $email;
$subject = 'Potvrď svoj komentár na kriticky.sk';

$text = "Ahoj $name,\n\nPotvrď, že tento komentár je od teba.\n\n$verifyUrl\n\nAk si komentár neposlal(a), správu ignoruj.";
$html = '<p>Ahoj ' . htmlspecialchars($name) . ',</p>'
      . '<p>Potvrď, že tento komentár je od teba:</p>'
      . '<p><a href="' . htmlspecialchars($verifyUrl) . '">Potvrdiť komentár</a></p>'
      . '<p>Ak si komentár neposlal(a), správu ignoruj.</p>';

try {
  foreach (['SMTP_HOST','SMTP_PORT','SMTP_SECURE','SMTP_USER','SMTP_PASS','SMTP_FROM'] as $k) {
    $v = cfg($k, getenv($k) ?: '');
    if ($v !== null && $v !== '') putenv($k . '=' . $v);
  }
  smtp_send_mail($to, $subject, $text, $html);
} catch (Throwable $e) {
  error_log('comments submit: smtp error: ' . $e->getMessage());
  // Log for later inspection (mask email)
  $masked = preg_replace('/(^.).*(@.*$)/', '$1***$2', $email);
  app_log('email_verification_send_failed', [
    'slug' => $slug,
    'to' => $masked,
    'error' => $e->getMessage(),
  ]);
}

echo json_encode(['ok' => true]);
exit;
