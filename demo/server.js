#!/usr/bin/env node

import http from 'node:http';
import process from 'node:process';

import VoiceAI from '../dist/index.esm.js';

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 3030);
const DEFAULT_API_URL = 'https://dev.voice.ai/api/v1';

const COMMANDS = [
  { name: 'agents:list', args: [] },
  { name: 'agents:get', args: ['agentId'] },
  { name: 'agents:create', args: [] },
  { name: 'agents:update', args: ['agentId'] },
  { name: 'agents:deploy', args: ['agentId'] },
  { name: 'agents:pause', args: ['agentId'] },
  { name: 'agents:disable', args: ['agentId'] },
  { name: 'agents:delete', args: ['agentId'] },
  { name: 'agents:init-template', args: [] },
  { name: 'agents:status', args: ['agentId'] },
  { name: 'agents:assign-kb', args: ['agentId', 'kbId'] },
  { name: 'agents:unassign-kb', args: ['agentId'] },
  { name: 'agents:outbound-call', args: [] },
  { name: 'kb:list', args: [] },
  { name: 'kb:get', args: ['kbId'] },
  { name: 'kb:create', args: [] },
  { name: 'kb:update', args: ['kbId'] },
  { name: 'kb:remove', args: ['kbId'] },
  { name: 'phone:list', args: [] },
  { name: 'phone:list-available', args: [] },
  { name: 'phone:search', args: [] },
  { name: 'phone:select', args: ['phoneNumber', 'provider'] },
  { name: 'phone:release', args: ['phoneNumber', 'provider'] },
  { name: 'analytics:history', args: [] },
  { name: 'analytics:transcript', args: ['callId'] },
  { name: 'analytics:recording', args: ['callId'] },
  { name: 'analytics:stats', args: [] },
  { name: 'tts:list-voices', args: [] },
  { name: 'tts:get-voice', args: ['voiceId'] },
  { name: 'tts:clone-voice', args: [] },
  { name: 'tts:update-voice', args: ['voiceId'] },
  { name: 'tts:delete-voice', args: ['voiceId'] },
  { name: 'tts:synthesize', args: [] },
  { name: 'tts:synthesize-stream', args: [] },
  { name: 'tts:list-dicts', args: [] },
  { name: 'tts:get-dict', args: ['dictionaryId'] },
  { name: 'tts:create-dict-rules', args: [] },
  { name: 'tts:create-dict-file', args: [] },
  { name: 'tts:update-dict', args: ['dictionaryId'] },
  { name: 'tts:delete-dict', args: ['dictionaryId'] },
  { name: 'tts:set-dict-rules', args: ['dictionaryId'] },
  { name: 'tts:add-dict-rules', args: ['dictionaryId'] },
  { name: 'tts:remove-dict-rules', args: ['dictionaryId'] },
  { name: 'tts:download-dict-version', args: ['dictionaryId', 'version'] },
  { name: 'managed:google:start-oauth', args: ['agentId'] },
  { name: 'managed:google:status', args: ['agentId'] },
  { name: 'managed:google:disconnect', args: ['agentId'] },
  { name: 'voice:get-connection-details', args: ['agentId'] },
];

function json(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(JSON.stringify(body, null, 2));
}

function sendError(response, error) {
  const statusCode = Number.isInteger(error?.status) ? error.status : 500;
  const body = {
    error: error instanceof Error ? error.message : String(error),
    ...(Number.isInteger(error?.status) ? { status: error.status } : {}),
    ...(typeof error?.code === 'string' ? { code: error.code } : {}),
    ...(typeof error?.detail === 'string' ? { detail: error.detail } : {}),
  };
  json(response, statusCode, body);
}

function createSdkFromEnv() {
  const apiKey = process.env.VOICEAI_API_KEY || '';
  const apiUrl = process.env.VOICEAI_API_URL || DEFAULT_API_URL;

  if (!apiKey) {
    throw new Error('Set VOICEAI_API_KEY before starting the test server.');
  }

  return new VoiceAI({
    apiUrl,
    apiKey,
  });
}

function requirePositional(args, index, label) {
  const value = args[index];
  if (!value) {
    throw new Error(`Missing ${label}.`);
  }
  return value;
}

function requireNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a number.`);
  }
  return parsed;
}

function requireObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return value;
}

function requireArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be a JSON array.`);
  }
  return value;
}

function extensionFromAudioFormat(payload) {
  const format = payload?.audio_format;
  if (typeof format !== 'string' || format.length === 0) {
    return 'mp3';
  }
  return format.toLowerCase();
}

async function runSdkCommand({ sdk, command, args = [], payload, file, flags = {} }) {
  switch (command) {
    case 'agents:list':
      return { type: 'json', value: await sdk.agents.list(payload) };
    case 'agents:get':
      return { type: 'json', value: await sdk.agents.getById(requirePositional(args, 0, 'agentId')) };
    case 'agents:create':
      return { type: 'json', value: await sdk.agents.create(requireObject(payload, 'Agent payload')) };
    case 'agents:update':
      return { type: 'json', value: await sdk.agents.update(requirePositional(args, 0, 'agentId'), requireObject(payload, 'Agent update payload')) };
    case 'agents:deploy':
      return { type: 'json', value: await sdk.agents.deploy(requirePositional(args, 0, 'agentId')) };
    case 'agents:pause':
      return { type: 'json', value: await sdk.agents.pause(requirePositional(args, 0, 'agentId')) };
    case 'agents:disable':
    case 'agents:delete':
      return { type: 'json', value: await sdk.agents.disable(requirePositional(args, 0, 'agentId')) };
    case 'agents:init-template':
      return { type: 'json', value: await sdk.agents.initFromTemplate(payload) };
    case 'agents:status':
      return { type: 'json', value: await sdk.agents.getStatus(requirePositional(args, 0, 'agentId')) };
    case 'agents:assign-kb':
      return { type: 'json', value: await sdk.agents.assignKnowledgeBase(requirePositional(args, 0, 'agentId'), requireNumber(requirePositional(args, 1, 'kbId'), 'kbId')) };
    case 'agents:unassign-kb':
      await sdk.agents.unassignKnowledgeBase(requirePositional(args, 0, 'agentId'));
      return { type: 'json', value: { ok: true } };
    case 'agents:outbound-call':
      return { type: 'json', value: await sdk.agents.createOutboundCall(requireObject(payload, 'Outbound call payload')) };
    case 'kb:list':
      return { type: 'json', value: await sdk.knowledgeBase.list(payload) };
    case 'kb:get':
      return { type: 'json', value: await sdk.knowledgeBase.getById(requireNumber(requirePositional(args, 0, 'kbId'), 'kbId')) };
    case 'kb:create':
      return { type: 'json', value: await sdk.knowledgeBase.create(requireObject(payload, 'Knowledge base payload')) };
    case 'kb:update':
      return { type: 'json', value: await sdk.knowledgeBase.update(requireNumber(requirePositional(args, 0, 'kbId'), 'kbId'), requireObject(payload, 'Knowledge base update payload')) };
    case 'kb:remove':
      await sdk.knowledgeBase.remove(requireNumber(requirePositional(args, 0, 'kbId'), 'kbId'));
      return { type: 'json', value: { ok: true } };
    case 'phone:list':
      return { type: 'json', value: await sdk.phoneNumbers.list(payload) };
    case 'phone:list-available':
      return { type: 'json', value: await sdk.phoneNumbers.listAvailable(payload) };
    case 'phone:search':
      return { type: 'json', value: await sdk.phoneNumbers.search(requireObject(payload, 'Phone search payload')) };
    case 'phone:select':
      return { type: 'json', value: await sdk.phoneNumbers.select(requirePositional(args, 0, 'phoneNumber'), args[1] || 'twilio') };
    case 'phone:release':
      return { type: 'json', value: await sdk.phoneNumbers.release(requirePositional(args, 0, 'phoneNumber'), args[1] || 'twilio') };
    case 'analytics:history':
      return { type: 'json', value: await sdk.analytics.getCallHistory(payload) };
    case 'analytics:transcript':
      return { type: 'json', value: await sdk.analytics.getTranscriptUrl(requirePositional(args, 0, 'callId')) };
    case 'analytics:recording':
      return { type: 'json', value: await sdk.analytics.getRecordingUrl(requirePositional(args, 0, 'callId')) };
    case 'analytics:stats':
      return { type: 'json', value: await sdk.analytics.getStatsSummary() };
    case 'tts:list-voices':
      return { type: 'json', value: await sdk.tts.listVoices() };
    case 'tts:get-voice':
      return { type: 'json', value: await sdk.tts.getVoice(requirePositional(args, 0, 'voiceId')) };
    case 'tts:clone-voice':
      if (!file) throw new Error('This command requires a file upload.');
      return { type: 'json', value: await sdk.tts.cloneVoice({ ...requireObject(payload, 'Clone voice payload'), file }) };
    case 'tts:update-voice':
      return { type: 'json', value: await sdk.tts.updateVoice(requirePositional(args, 0, 'voiceId'), requireObject(payload, 'Voice update payload')) };
    case 'tts:delete-voice':
      return { type: 'json', value: await sdk.tts.deleteVoice(requirePositional(args, 0, 'voiceId')) };
    case 'tts:synthesize': {
      const request = requireObject(payload, 'TTS payload');
      return { type: 'binary', blob: await sdk.tts.synthesize(request), filename: `voiceai-speech.${extensionFromAudioFormat(request)}` };
    }
    case 'tts:synthesize-stream': {
      const request = requireObject(payload, 'Streaming TTS payload');
      const response = await sdk.tts.synthesizeStream(request);
      return { type: 'binary', blob: await response.blob(), filename: `voiceai-stream.${extensionFromAudioFormat(request)}` };
    }
    case 'tts:list-dicts':
      return { type: 'json', value: await sdk.tts.listPronunciationDictionaries() };
    case 'tts:get-dict':
      return { type: 'json', value: await sdk.tts.getPronunciationDictionary(requirePositional(args, 0, 'dictionaryId')) };
    case 'tts:create-dict-rules':
      return { type: 'json', value: await sdk.tts.createPronunciationDictionaryFromRules(requireObject(payload, 'Dictionary rules payload')) };
    case 'tts:create-dict-file':
      if (!file) throw new Error('This command requires a file upload.');
      return { type: 'json', value: await sdk.tts.createPronunciationDictionaryFromFile({ ...requireObject(payload, 'Dictionary file payload'), file }) };
    case 'tts:update-dict':
      return { type: 'json', value: await sdk.tts.updatePronunciationDictionary(requirePositional(args, 0, 'dictionaryId'), requireObject(payload, 'Dictionary update payload')) };
    case 'tts:delete-dict':
      return { type: 'json', value: await sdk.tts.deletePronunciationDictionary(requirePositional(args, 0, 'dictionaryId')) };
    case 'tts:set-dict-rules':
      return { type: 'json', value: await sdk.tts.setPronunciationDictionaryRules(requirePositional(args, 0, 'dictionaryId'), requireArray(payload, 'Rules payload')) };
    case 'tts:add-dict-rules':
      return { type: 'json', value: await sdk.tts.addPronunciationDictionaryRules(requirePositional(args, 0, 'dictionaryId'), requireArray(payload, 'Rules payload')) };
    case 'tts:remove-dict-rules':
      return { type: 'json', value: await sdk.tts.removePronunciationDictionaryRules(requirePositional(args, 0, 'dictionaryId'), requireArray(payload, 'Rule id payload')) };
    case 'tts:download-dict-version':
      return {
        type: 'binary',
        blob: await sdk.tts.downloadPronunciationDictionaryVersion(
          requirePositional(args, 0, 'dictionaryId'),
          requireNumber(requirePositional(args, 1, 'version'), 'version')
        ),
        filename: `${requirePositional(args, 0, 'dictionaryId')}-${requirePositional(args, 1, 'version')}.pls`,
      };
    case 'managed:google:start-oauth':
      return { type: 'json', value: await sdk.managedTools.google.startOAuth(requirePositional(args, 0, 'agentId'), payload) };
    case 'managed:google:status':
      return { type: 'json', value: await sdk.managedTools.google.getStatus(requirePositional(args, 0, 'agentId')) };
    case 'managed:google:disconnect':
      return { type: 'json', value: await sdk.managedTools.google.disconnect(requirePositional(args, 0, 'agentId')) };
    case 'voice:get-connection-details':
      return {
        type: 'json',
        value: await sdk.getConnectionDetails({
          ...(payload ? requireObject(payload, 'Connection details payload') : {}),
          agentId: requirePositional(args, 0, 'agentId'),
          ...(flags.testMode ? { testMode: true } : {}),
        }),
      };
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

async function readBody(request) {
  const method = request.method || 'GET';
  if (method === 'GET' || method === 'HEAD') {
    return {};
  }

  const url = `http://${request.headers.host || `${HOST}:${PORT}`}${request.url || '/'}`;
  const fetchRequest = new Request(url, {
    method,
    headers: request.headers,
    body: request,
    duplex: 'half',
  });

  const contentType = request.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    const formData = await fetchRequest.formData();
    const args = JSON.parse(String(formData.get('args') || '[]'));
    const payloadText = String(formData.get('payload') || '').trim();
    const flagsText = String(formData.get('flags') || '').trim();
    return {
      command: String(formData.get('command') || '').trim() || undefined,
      args,
      payload: payloadText ? JSON.parse(payloadText) : undefined,
      flags: flagsText
        ? JSON.parse(flagsText)
        : {
            testMode: String(formData.get('testMode') || '') === 'true',
          },
      file: formData.get('file') instanceof File ? formData.get('file') : undefined,
    };
  }

  const text = await fetchRequest.text();
  return text.trim() ? JSON.parse(text) : {};
}

async function sendResult(response, result) {
  if (result.type === 'json') {
    json(response, 200, result.value);
    return;
  }

  const arrayBuffer = await result.blob.arrayBuffer();
  response.writeHead(200, {
    'Content-Type': result.blob.type || 'application/octet-stream',
    'Content-Length': arrayBuffer.byteLength,
    'Content-Disposition': `attachment; filename="${result.filename}"`,
    'Cache-Control': 'no-store',
  });
  response.end(Buffer.from(arrayBuffer));
}

async function route(request, response) {
  if (request.method === 'GET' && request.url === '/health') {
    json(response, 200, { ok: true });
    return;
  }

  if (request.method === 'GET' && request.url === '/commands') {
    json(response, 200, {
      apiUrl: process.env.VOICEAI_API_URL || DEFAULT_API_URL,
      hasApiKey: Boolean(process.env.VOICEAI_API_KEY),
      commands: COMMANDS,
    });
    return;
  }

  if (request.method === 'POST' && request.url === '/run') {
    try {
      const { command, args = [], payload, flags = {}, file } = await readBody(request);
      const sdk = createSdkFromEnv();
      const result = await runSdkCommand({ sdk, command, args, payload, flags, file });
      await sendResult(response, result);
    } catch (error) {
      sendError(response, error);
    }
    return;
  }

  if (request.method === 'GET' && request.url === '/') {
    json(response, 200, {
      message: 'Voice.ai SDK test server',
      endpoints: {
        health: 'GET /health',
        commands: 'GET /commands',
        run: 'POST /run',
      },
    });
    return;
  }

  response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ error: 'Not found' }, null, 2));
}

const server = http.createServer((request, response) => {
  route(request, response).catch((error) => {
    sendError(response, error);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Voice.ai SDK test server running at http://${HOST}:${PORT}`);
  console.log(`Health:   http://${HOST}:${PORT}/health`);
  console.log(`Commands: http://${HOST}:${PORT}/commands`);
});
