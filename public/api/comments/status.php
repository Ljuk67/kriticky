<?php
// Diagnostic endpoint: shows whether required configs are present and tests Supabase connectivity.
// Does not leak secrets. Safe to keep, but you may remove after setup.

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/../lib/config.php';
require_once __DIR__ . '/../lib/logger.php';

$out = [
  'supabaseUrl' => (bool)cfg('SUPABASE_URL', ''),
  'serviceRole' => (bool)cfg('SUPABASE_SERVICE_ROLE_KEY', ''),
  'smtp' => [
    'host' => (bool)cfg('SMTP_HOST', ''),
    'user' => (bool)cfg('SMTP_USER', ''),
    'pass' => (bool)cfg('SMTP_PASS', ''),
    'from' => (bool)cfg('SMTP_FROM', ''),
  ],
  'supabase' => [ 'selectStatus' => null, 'error' => null ],
  'log' => [ 'path' => null, 'writable' => null, 'error' => null ],
];

// Minimal Supabase SELECT test (no data written)
try {
  $sbUrl = rtrim((string)cfg('SUPABASE_URL', ''), '/');
  $key = (string)cfg('SUPABASE_SERVICE_ROLE_KEY', '');
  if ($sbUrl && $key) {
    $ch = curl_init($sbUrl . '/rest/v1/comments?select=id&limit=1');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
      'apikey: ' . $key,
      'Authorization: Bearer ' . $key,
      'Accept: application/json',
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 8);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    $out['supabase']['selectStatus'] = $status;
    if ($status < 200 || $status >= 300) {
      $out['supabase']['error'] = substr((string)$body ?: $err, 0, 240);
    }
  }
} catch (Throwable $e) {
  $out['supabase']['error'] = $e->getMessage();
}

// Log path/writability probe
try {
  $path = log_path();
  $out['log']['path'] = $path;
  $dir = dirname($path);
  if (!is_dir($dir)) @mkdir($dir, 0700, true);
  $probe = ['ts' => date('c'), 'event' => 'status_probe'];
  $ok = @file_put_contents($path, json_encode($probe) . PHP_EOL, FILE_APPEND | LOCK_EX);
  $out['log']['writable'] = $ok !== false;
  if ($ok === false) $out['log']['error'] = 'file_put_contents failed';
} catch (Throwable $e) {
  $out['log']['writable'] = false;
  $out['log']['error'] = $e->getMessage();
}

echo json_encode($out);
