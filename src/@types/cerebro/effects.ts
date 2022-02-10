/*
 * Copyright (C) 2021 by Fonoster Inc (https://fonoster.com)
 * http://github.com/fonoster/rox
 *
 * This file is part of Rox AI
 *
 * Licensed under the MIT License (the "License");
 * you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *    https://opensource.org/licenses/MIT
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { VoiceResponse } from '@fonoster/voice'
import { EventsClient } from '../../events/emitter'

export interface EffectsManagerConfig {
  eventsClient: EventsClient | null
  voice: VoiceResponse
  voiceConfig: Record<string,unknown>
  activationIntent?: string
  playbackId: string
  transferMedia?: string
  transferMediaNoAnswer?: string
  transferMediaBusy?: string
  transferMessage?: string
  transferMessageNoAnswer?: string
  transferMessageBusy?: string
}

export interface Effect {
  type: 'say'
  | 'hangup'
  | 'send_data'
  | 'transfer'
  parameters: Record<string, unknown>
}