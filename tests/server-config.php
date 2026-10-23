<?php
declare(strict_types=1);
$mode = $argv[1];
if ($mode === 'layout' || $mode === 'layout-public') {
  $fixture = __DIR__ . '/config-fixture-' . bin2hex(random_bytes(6));
  mkdir($fixture . '/web/api/lib', 0700, true);
  mkdir($fixture . '/private', 0700);
  copy(__DIR__ . '/../public/api/lib/config.php', $fixture . '/web/api/lib/config.php');
  $contents = "<?php return ['CONFIG_TEST' => 'private-value'];";
  if ($mode === 'layout-public') {
    file_put_contents($fixture . '/web/exposed.php', $contents);
    symlink($fixture . '/web/exposed.php', $fixture . '/private/server.php');
  } else file_put_contents($fixture . '/private/server.php', $contents);
  putenv('KRITICKY_CONFIG_FILE');
  putenv('CONFIG_TEST');
  $_SERVER['DOCUMENT_ROOT'] = $fixture . '/web';
  try {
    require $fixture . '/web/api/lib/config.php';
    if ($mode === 'layout') {
      if (cfg('CONFIG_TEST') !== 'private-value') throw new LogicException('Sibling config not loaded');
    } else {
      try {
        cfg('CONFIG_TEST');
        throw new LogicException('Public symlink accepted');
      } catch (RuntimeException $e) {
        if (!str_contains($e->getMessage(), 'outside public')) throw $e;
      }
    }
  } finally {
    unlink($fixture . '/private/server.php');
    if ($mode === 'layout-public') unlink($fixture . '/web/exposed.php');
    unlink($fixture . '/web/api/lib/config.php');
    foreach (['/web/api/lib', '/web/api', '/web', '/private', ''] as $dir) rmdir($fixture . $dir);
  }
  echo "PASS: $mode\n";
  exit;
}
require __DIR__ . '/../public/api/lib/config.php';
if ($mode === 'env') {
  putenv('SMTP_PASS=test-environment-value');
  putenv('KRITICKY_CONFIG_FILE=/missing/file');
  if (cfg('SMTP_PASS') !== 'test-environment-value') throw new RuntimeException('Environment precedence failed');
} elseif ($mode === 'missing') {
  putenv('KRITICKY_CONFIG_FILE');
  putenv('SMTP_PASS');
  if (cfg('SMTP_PASS', 'missing') !== 'missing') throw new RuntimeException('Unexpected fallback');
} elseif ($mode === 'private') {
  putenv('KRITICKY_CONFIG_FILE=' . __DIR__ . '/../config/server.example.php');
  putenv('SMTP_USER');
  if (cfg('SMTP_USER') !== 'admin@kriticky.sk') throw new RuntimeException('Private config not loaded');
} elseif ($mode === 'public' || $mode === 'symlink') {
  $path = __DIR__ . '/../public/api/lib/config.php';
  if ($mode === 'symlink') {
    $link = __DIR__ . '/config-link.php';
    symlink($path, $link);
    $path = $link;
  }
  putenv('KRITICKY_CONFIG_FILE=' . $path);
  try {
    cfg('TEST_ABSENT');
    throw new LogicException('Public configuration accepted');
  } catch (RuntimeException $e) {
    if (!str_contains($e->getMessage(), 'outside public')) throw $e;
  } finally {
    if (isset($link)) unlink($link);
  }
} else throw new RuntimeException('Unknown case');
echo "PASS: $mode\n";
