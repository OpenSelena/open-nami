import test from 'node:test'
import assert from 'node:assert/strict'
import {renderCarouselTrack, DownloadingView} from './downloading-view.js'

test('DownloadingView is exported as a function component', () => {
  assert.equal(typeof DownloadingView, 'function')
})

test('renderCarouselTrack renders dot indicators representing album slides', () => {
  const track = renderCarouselTrack(2, 5)
  assert.equal(track, '● ● ○ ○ ○')
})

test('renderCarouselTrack clamps bounds safely', () => {
  const track = renderCarouselTrack(10, 3)
  assert.equal(track, '● ● ●')
})
