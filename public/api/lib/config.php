<?php
declare(strict_types=1);

function _cfg_cache(): array {
  static $cache = null;
  if ($cache !== null) return $cache;
  $root = dirname(__DIR__, 3);
  $path = getenv('KRITICKY_CONFIG_FILE');
  if ($path === false || $path === '') {
    $path = $root . '/private/server.php';
    if (!file_exists($path) && !is_link($path)) return $cache = [];
  }
  $resolved = realpath($path);
  if ($path[0] !== '/' || $resolved === false || !is_file($resolved) || !is_readable($resolved)) {
    throw new RuntimeException('Server configuration must be a readable absolute private file.');
  }
  $publicRoots = [$root . '/public', $root . '/dist', dirname(__DIR__, 2)];
  if (!empty($_SERVER['DOCUMENT_ROOT'])) $publicRoots[] = $_SERVER['DOCUMENT_ROOT'];
  foreach ($publicRoots as $publicRoot) {
    $publicRoot = realpath($publicRoot);
    if ($publicRoot !== false && ($resolved === $publicRoot || str_starts_with($resolved, rtrim($publicRoot, '/') . '/'))) {
      throw new RuntimeException('Server configuration must be outside public directories and the document root.');
    }
  }
  $values = require $resolved;
  if (!is_array($values)) throw new RuntimeException('Private server configuration must return an array.');
  return $cache = $values;
}

function cfg(string $key, ?string $default = null): ?string {
  $value = getenv($key);
  if ($value !== false) return $value;
  $values = _cfg_cache();
  return array_key_exists($key, $values) ? (string)$values[$key] : $default;
}
