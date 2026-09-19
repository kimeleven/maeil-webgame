import{getSql}from"../lib/db.js";import{extrasById,loadFallbackCatalog,mapGameRow}from"../lib/games-fallback.js";import{send}from"../lib/http.js";export default async function handler(e,o){if("GET"!==e.method)return void send(o,405,{error:"GET만 지원합니다."});const a=extrasById(),t=getSql();if(t)try{const e=await(t`
        SELECT id, title, genre, published_on, path, description
        FROM games
        ORDER BY published_on DESC
      `);if(e.length)return void send(o,200,{source:"neon",timezone:"Asia/Seoul",games:e.map(e=>mapGameRow(e,a.get(e.id)||{}))})}catch(e){console.error("GET /api/games",e)}const r=loadFallbackCatalog();send(o,200,{source:"json",...r})}
