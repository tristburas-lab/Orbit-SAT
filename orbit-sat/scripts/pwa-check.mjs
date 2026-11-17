import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const stores=new Map(),events={};
const caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);return{async addAll(paths){for(const path of paths){const file=new URL('../dist'+(path==='/'?'/index.html':path),import.meta.url);map.set(path,new Response(readFileSync(file)));}},async put(key,response){map.set(typeof key==='string'?key:key.url,response.clone());}};},async keys(){return[...stores.keys()];},async delete(key){return stores.delete(key);},async match(key){for(const map of stores.values()){const value=map.get(typeof key==='string'?key:key.url);if(value)return value.clone();}}};
const self={location:{origin:'https://orbit.example'},addEventListener(type,fn){events[type]=fn;},skipWaiting(){},clients:{claim(){}}};
vm.runInNewContext(readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8'),{self,caches,URL,fetch:async()=>{throw Error('Simulated offline network');},Response,Promise});
let job;events.install({waitUntil(p){job=p;}});await job;stores.set('orbit-static-old',new Map());events.activate({waitUntil(p){job=p;}});await job;assert.ok(!stores.has('orbit-static-old'));
for(const path of['/questions.js','/app.js','/tutor-worker.js','/icons/icon-192.png']){let response;events.fetch({request:{url:'https://orbit.example'+path,method:'GET',mode:'cors'},respondWith(p){response=p;},waitUntil(){}});assert.ok((await response).ok,path);}
let navigation;events.fetch({request:{url:'https://orbit.example/?challenge=M001.M002',method:'GET',mode:'navigate'},respondWith(p){navigation=p;},waitUntil(){}});assert.match(await(await navigation).text(),/<!doctype html>/i);
let intercepted=false;events.fetch({request:{url:'https://orbit.example/signin-with-chatgpt',method:'GET',mode:'navigate'},respondWith(){intercepted=true;}});assert.equal(intercepted,false);
console.log('PASS offline bank, tutor modules, icons, shell fallback, cache cleanup, and auth-route exclusion.');
