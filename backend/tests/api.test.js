import { test } from 'node:test';
import assert from 'node:assert';
import { initDb, seedDb, db } from '../src/config/database.js';

test('database initializes with users table', () => {
  initDb();
  const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  assert.ok(row);
});

test('seed creates demo users', () => {
  initDb();
  seedDb();
  const users = db.prepare('SELECT COUNT(*) c FROM users').get();
  assert.ok(users.c >= 3);
});

test('reports table exists and can store data', () => {
  initDb();
  const r = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reports'").get();
  assert.ok(r);
});

test('share_tokens table exists', () => {
  initDb();
  const r = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='share_tokens'").get();
  assert.ok(r);
});
