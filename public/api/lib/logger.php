<?php
declare(strict_types=1);

function _log_path(): string {
  $file = getenv('LOG_FILE');
  if ($file && $file !== false) return $file;
  $dir = getenv('LOG_DIR');
  if ($dir && $dir !== false) return rtrim($dir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'comments.log';
  return sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'kriticky-comments.log';
}

function app_log(string $event, array $data = []): void {
  $line = [
    'ts' => date('c'),
    'event' => $event,
    'ip' => $_SERVER['REMOTE_ADDR'] ?? null,
    'ua' => $_SERVER['HTTP_USER_AGENT'] ?? null,
  ] + $data;
  $json = json_encode($line, JSON_UNESCAPED_UNICODE);
  $path = _log_path();
  try {
    file_put_contents($path, $json . PHP_EOL, FILE_APPEND | LOCK_EX);
  } catch (Throwable $e) {
    // Fallback to PHP error_log if filesystem write fails
    error_log('app_log failed: ' . $e->getMessage() . ' line=' . $json);
  }
}

