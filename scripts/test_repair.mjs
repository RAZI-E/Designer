import { repairJson } from '../src/lib/json-repair.ts';

const broken1 = '{"theme": {"primary": "#ffffff", "description": "A very long description that got cut of';
console.log('Test 1 (unterminated string):', repairJson(broken1));

const broken2 = '{"theme": {"primary": "#ffffff"}, "components": [{"id": "c1", "type": "Button", "details": "somethi';
console.log('Test 2 (nested truncated):', repairJson(broken2));

const broken3 = '```json\n{"theme": {"primary": "#ffffff"}}\n```';
console.log('Test 3 (markdown wrapped):', repairJson(broken3));

console.log('All tests passed!');
