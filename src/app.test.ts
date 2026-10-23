import test from 'node:test'
import assert from 'node:assert/strict'
import {TAGLINE, HINTS} from './app.js'

test('TAGLINE matches Open Omni format: grab any profile. paste. download. done.', () => {
  assert.equal(TAGLINE, 'grab any profile. paste. download. done.')
})

test('HINTS includes correct keybindings for platform selection phase', () => {
  assert.ok(HINTS.platform, 'HINTS must include platform phase')
  assert.deepEqual(HINTS.platform, [
    ['↑↓', 'choose'],
    ['↵', 'select'],
    ['esc', 'back'],
    ['^c', 'quit'],
  ])
})

test('HINTS includes correct keybindings for picking phase', () => {
  assert.ok(HINTS.picking, 'HINTS must include picking phase')
  assert.deepEqual(HINTS.picking, [
    ['↑↓', 'choose'],
    ['↵', 'download'],
    ['esc', 'back'],
    ['^c', 'quit'],
  ])
})

test('HINTS includes settings, watcher, and batch shortcuts in input phase', () => {
  assert.ok(HINTS.input, 'HINTS must include input phase')
  assert.deepEqual(HINTS.input, [
    ['↵', 'download'],
    ['^w', 'watcher'],
    ['^b', 'batch'],
    ['^s', 'settings'],
    ['^c', 'quit'],
  ])
})

test('HINTS includes navigation and action shortcuts in settings phase', () => {
  assert.ok(HINTS.settings, 'HINTS must include settings phase')
  assert.deepEqual(HINTS.settings, [
    ['tab', 'switch field'],
    ['↵', 'save'],
    ['esc', 'back'],
    ['^c', 'quit'],
  ])
})

test('HINTS includes watcher shortcuts', () => {
  assert.ok(HINTS.watcher, 'HINTS must include watcher phase')
  assert.deepEqual(HINTS.watcher, [
    ['c', 'target'],
    ['m', 'sidecar'],
    ['o', 'open dir'],
    ['esc', 'back'],
    ['^c', 'quit'],
  ])
})

test('HINTS includes batch shortcuts', () => {
  assert.ok(HINTS.batch, 'HINTS must include batch phase')
  assert.deepEqual(HINTS.batch, [
    ['tab', 'switch field'],
    ['c', 'target'],
    ['m', 'sidecar'],
    ['l', 'limit'],
    ['d', 'date'],
    ['r', 'resume'],
    ['↵', 'start'],
    ['esc', 'back'],
    ['^c', 'quit'],
  ])
})
