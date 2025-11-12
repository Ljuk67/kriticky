<?php
// Copy this file to config.local.php and fill in real values.
// Keep it out of git (already ignored). The file returns an assoc array of secrets.
return [
  // Supabase (server-side)
  'SUPABASE_URL' => 'https://vwdomomsktikkpibdxki.supabase.co',
  'SUPABASE_SERVICE_ROLE_KEY' => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3ZG9tb21za3Rpa2twaWJkeGtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzYyMDk2NywiZXhwIjoyMDczMTk2OTY3fQ.mtf-xX8LPfpiNLYpZcC0fGPXT6EtnX8kC16puhmo1hk',

  // Client-side listing (optional here; typically set as PUBLIC_ env in Astro)
  // 'PUBLIC_SUPABASE_URL' => '',
  // 'PUBLIC_SUPABASE_ANON_KEY' => '',

  // SMTP (Websupport)
  'SMTP_HOST' => 'smtp.m1.websupport.sk',
  'SMTP_PORT' => '587',
  'SMTP_SECURE' => 'starttls',
  'SMTP_USER' => 'admin@kriticky.sk',
  'SMTP_PASS' => 'l#Df2C_./J]6yX)(=2x~',
  'SMTP_FROM' => 'admin@kriticky.sk',
  'ADMIN_NOTIFY_TO' => 'mysli@kriticky.sk',

  // Optional logging location
  // 'LOG_FILE' => '/kriticky.sk/logs/comments.log',
  // or
  'LOG_DIR' => '/kriticky.sk/logs',
];

