import{cleanNickname,ensureGuest,getSql,isAnonId,isGameId,parseScore}from"../lib/db.js";import{queryOf,readBody,send}from"../lib/http.js";export default async function handler(e,n){const o=getSql();if(o)try{if("GET"===e.method)return void await getScores(o,e,n);if("POST"===e.method)return void await postScore(o,e,n);send(n,405,{error:"GET 또는 POST만 지원합니다."})}catch(e){console.error("/api/scores",e),send(n,500,{error:"점수를 처리하지 못했습니다.",fallback:!0})}else send(n,503,{error:"DATABASE_URL이 없습니다.",fallback:!0})}async function getScores(e,n,o){const r=queryOf(n),i=r.game_id,a=r.anon_id,s=Math.min(20,Math.max(1,Number(r.limit)||10));if(i&&!isGameId(i))return void send(o,400,{error:"game_id가 올바르지 않습니다."});if(a&&!isAnonId(a))return void send(o,400,{error:"anon_id가 올바르지 않습니다."});if(!i&&a){const n=await(e`
      SELECT game_id, score
      FROM high_scores
      WHERE anon_id = ${a}
    `);return void send(o,200,{source:"neon",scores:n.map(e=>({gameId:e.game_id,highScore:e.score}))})}if(!i)return void send(o,400,{error:"game_id 또는 anon_id가 필요합니다."});const c=await(e`
    SELECT anon_id, nickname, score
    FROM high_scores
    WHERE game_id = ${i}
    ORDER BY score DESC, created_at ASC
    LIMIT ${s}
  `);let d=null;if(a){const n=await(e`
      SELECT score FROM high_scores
      WHERE game_id = ${i} AND anon_id = ${a}
    `);d=n[0]?.score??null}send(o,200,{source:"neon",gameId:i,mine:d,top:c.map((e,n)=>({rank:n+1,score:e.score,nickname:e.nickname||"게스트",mine:Boolean(a&&e.anon_id===a)}))})}async function postScore(e,n,o){const r=await readBody(n),i=r.anon_id,a=r.game_id,s=parseScore(r.score),c=cleanNickname(r.nickname);if(!isAnonId(i)||!isGameId(a)||null===s)return void send(o,400,{error:"anon_id, game_id, score가 필요합니다."});await ensureGuest(e,i,c);const d=await(e`
    SELECT score FROM high_scores
    WHERE game_id = ${a} AND anon_id = ${i}
  `),t=d[0]?.score??0,m=await(e`
    INSERT INTO high_scores (game_id, anon_id, nickname, score)
    VALUES (${a}, ${i}, ${c}, ${s})
    ON CONFLICT (game_id, anon_id) DO UPDATE
      SET score = GREATEST(high_scores.score, EXCLUDED.score),
          nickname = COALESCE(EXCLUDED.nickname, high_scores.nickname)
    RETURNING score
  `);send(o,200,{source:"neon",gameId:a,lastScore:s,highScore:m[0].score,isNewHigh:s>t})}
