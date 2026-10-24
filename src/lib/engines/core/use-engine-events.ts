import { useState, useEffect } from 'react'
import { EngineEventBus, type EngineEventMap } from './event-bus.js'
import { defaultTaskManager } from './task-manager.js'
import type { EngineProgress, EngineResult } from '../types.js'

export interface EngineEventSubscriptionState {
  isDownloading: boolean
  activeJob?: EngineEventMap['job:start']
  progress?: EngineProgress
  lastError?: string
  lastResult?: EngineResult
}

export const INITIAL_ENGINE_EVENT_STATE: EngineEventSubscriptionState = {
  isDownloading: false,
  activeJob: undefined,
  progress: undefined,
  lastError: undefined,
  lastResult: undefined,
}

export function subscribeToEngineEvents(
  bus: EngineEventBus,
  onChange: (state: EngineEventSubscriptionState) => void,
): () => void {
  let state: EngineEventSubscriptionState = { ...INITIAL_ENGINE_EVENT_STATE }

  const onJobStart = (payload: EngineEventMap['job:start']) => {
    state = {
      ...state,
      isDownloading: true,
      activeJob: payload,
      progress: undefined,
      lastError: undefined,
      lastResult: undefined,
    }
    onChange(state)
  }

  const onJobProgress = (payload: EngineEventMap['job:progress']) => {
    state = {
      ...state,
      isDownloading: true,
      progress: payload,
    }
    onChange(state)
  }

  const onJobComplete = (payload: EngineEventMap['job:complete']) => {
    state = {
      ...state,
      isDownloading: false,
      lastResult: payload.result,
    }
    onChange(state)
  }

  const onJobError = (payload: EngineEventMap['job:error']) => {
    state = {
      ...state,
      isDownloading: false,
      lastError: payload.error,
    }
    onChange(state)
  }

  const unsubStart = bus.on('job:start', onJobStart)
  const unsubProgress = bus.on('job:progress', onJobProgress)
  const unsubComplete = bus.on('job:complete', onJobComplete)
  const unsubError = bus.on('job:error', onJobError)

  return () => {
    if (typeof bus.off === 'function') {
      bus.off('job:start', onJobStart)
      bus.off('job:progress', onJobProgress)
      bus.off('job:complete', onJobComplete)
      bus.off('job:error', onJobError)
    }
    unsubStart?.()
    unsubProgress?.()
    unsubComplete?.()
    unsubError?.()
  }
}

export function useEngineEvents(customBus?: EngineEventBus): EngineEventSubscriptionState {
  const bus = customBus || defaultTaskManager.events
  const [state, setState] = useState<EngineEventSubscriptionState>(() => ({
    ...INITIAL_ENGINE_EVENT_STATE,
  }))

  useEffect(() => {
    return subscribeToEngineEvents(bus, setState)
  }, [bus])

  return state
}
