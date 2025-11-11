<?php
// Verifies a pending comment by token and notifies admin on success.
// GET /api/comments/verify.php?token=...

declare(strict_types=1);

function envv(string $k, ?string $d=null): ?string { $v = getenv($k); return $v === false ? $d : $v; }

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');

$token = isset($_GET['token']) ? trim((string)$_GET['token']) : '';
if ($token === '') {
  http_response_code(400);
  echo 'Missing token';
  exit;
}

$sbUrl = rtrim((string)envv('SUPABASE_URL', ''), '/');
$sbServiceKey = (string)envv('SUPABASE_SERVICE_ROLE_KEY', '');
if ($sbUrl === '' || $sbServiceKey === '') {
  http_response_code(500);
  echo 'Server not configured';
  exit;
}

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

// Fetch the target comment by token and validity
$nowIso = (new DateTimeImmutable('now'))->format(DateTime::ATOM);
$sel = $sbUrl . '/rest/v1/comments?select=id,slug,name,message,is_approved,verify_expires_at&verify_token=eq.' . rawurlencode($token);
[$st, $body, $err] = sb_request('GET', $sel, $sbServiceKey);
if ($st < 200 || $st >= 300) {
  error_log('comments verify: select failed status=' . $st . ' err=' . $err . ' body=' . $body);
  echo 'Chyba overenia.'; exit;
}
$rows = json_decode($body, true);
if (!is_array($rows) || count($rows) === 0) { echo 'Neplatný alebo expirovaný odkaz.'; exit; }
$row = $rows[0];
if (!empty($row['is_approved'])) { $slug = $row['slug'] ?? ''; header('Location: ' . ('/' . 'blog/' . rawurlencode($slug) . '/#comments')); exit; }
// Expiry check
try {
  $exp = new DateTimeImmutable((string)$row['verify_expires_at']);
  if ($exp < new DateTimeImmutable('now')) { echo 'Overovací odkaz vypršal.'; exit; }
} catch (Throwable $e) { echo 'Overovací odkaz nie je platný.'; exit; }

// Approve the comment
$patchUrl = $sbUrl . '/rest/v1/comments?verify_token=eq.' . rawurlencode($token) . '&is_approved=is.false';
$update = [
  'is_approved' => true,
  'verified_at' => (new DateTimeImmutable('now'))->format(DateTime::ATOM),
  'verify_token' => null,
  'verify_expires_at' => null,
];
[$pst, $pbody, $perr] = sb_request('PATCH', $patchUrl, $sbServiceKey, $update, ['Prefer: return=representation']);
if ($pst < 200 || $pst >= 300) {
  error_log('comments verify: patch failed status=' . $pst . ' err=' . $perr . ' body=' . $pbody);
  echo 'Nepodarilo sa potvrdiť komentár.'; exit;
}
$rows2 = json_decode($pbody, true);
if (!is_array($rows2) || count($rows2) === 0) { echo 'Komentár už bol potvrdený alebo token je neplatný.'; exit; }
$approved = $rows2[0];

// Notify admin by email
require_once __DIR__ . '/../lib/config.php';
require_once __DIR__ . '/../lib/smtp.php';
require_once __DIR__ . '/../lib/logger.php';
$to = getenv('ADMIN_NOTIFY_TO') ?: 'mysli@kriticky.sk';
$subject = 'New comment on kriticky.sk';
$slug = (string)($approved['slug'] ?? '');
$name = (string)($approved['name'] ?? 'Anonym');
$message = (string)($approved['message'] ?? '');
$snippet = mb_substr($message, 0, 200);
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$host = $_SERVER['HTTP_HOST'] ?? 'kriticky.sk';
$base = $scheme . '://' . $host;
$postUrl = $base . '/blog/' . rawurlencode($slug) . '/#comments';

$text = "Nový komentár na kriticky.sk\nSlug: $slug\nMeno: $name\n\n$snippet\n\nLink: $postUrl";
$html = '<p><strong>Nový komentár na kriticky.sk</strong></p>'
      . '<p>Slug: <code>' . htmlspecialchars($slug) . '</code><br/>'
      . 'Meno: ' . htmlspecialchars($name) . '</p>'
      . '<blockquote>' . nl2br(htmlspecialchars($snippet)) . '</blockquote>'
      . '<p><a href="' . htmlspecialchars($postUrl) . '">Otvoriť článok</a></p>';
try {
  foreach (['SMTP_HOST','SMTP_PORT','SMTP_SECURE','SMTP_USER','SMTP_PASS','SMTP_FROM'] as $k) {
    $v = cfg($k, getenv($k) ?: '');
    if ($v !== null && $v !== '') putenv($k . '=' . $v);
  }
  smtp_send_mail($to, $subject, $text, $html);
} catch (Throwable $e) {
  error_log('comments verify: smtp notify error: ' . $e->getMessage());
  app_log('admin_notify_send_failed', [
    'slug' => $slug,
    'to' => $to,
    'error' => $e->getMessage(),
  ]);
}

// Redirect back to the article
header('Location: ' . $postUrl);
exit;
