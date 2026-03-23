wave_defs={
 {
  "...oooo...",
  ".aaaaaaaa.",
  ".aaaaaaaa.",
  "gggggggggg",
  "gggggggggg"
 },
 {
  "...occo...",
  ".aaaaaaaa.",
  ".aaaaaaaa.",
  "gggggggggg",
  "gggggggggg"
 },
 {
  "...occo...",
  ".aaaaaaaa.",
  ".aaassaaa.",
  "gggggggggg",
  "gggggggggg"
 },
 {
  "...oooo...",
  ".aasaasaa.",
  ".asaaaasa.",
  "gggggggggg",
  "gggggggggg"
 },
 {
  "...oooo...",
  ".asaaaasa.",
  ".aabaabaa.",
  "gggggggggg",
  "gggggggggg"
 },
 {
  "...occo...",
  ".aadssdaa.",
  ".paabbaap.",
  "gggggggggg",
  "wggggggggw"
 },
 {
  "...occo...",
  ".sadaadas.",
  ".abaaaaba.",
  "ggwgppgwgg",
  "gggggggggg"
 },
 {
  "...oooo...",
  ".dasaasad.",
  ".baaaaaab.",
  "sggpggpggs",
  "gggwggwggg"
 },
 {
  "...occo...",
  ".sdbbdbbs.",
  ".apassapa.",
  "ggwggggwgg",
  "wgggwggggw"
 }
}

function template_for_wave(n)
 local idx=((n-1)%#wave_defs)+1
 return wave_defs[idx]
end

function spawn_wave_enemy(kind,row,col,slot)
 local def=enemy_defs[kind]
 local tx,ty=enemy_slot_xy(row,col)
 local side=(slot%2==0) and -20 or 148
 return {
  kind=kind,
  row=row,
  col=col,
  x=side,
  y=-16-rnd(24),
  tx=tx,
  ty=ty,
  sx=side,
  sy=-16-rnd(24),
  dir=(side<0) and 1 or -1,
  state="queued",
  hp=def.hp,
  t=0,
  anim=flr(rnd(60)),
  spawn_t=slot*7+row*6,
  dive_kind=1+flr(rnd(4)),
  shot_t=20+flr(rnd(70)),
  captured=false,
  beam_t=0,
  beam_x=0
 }
end

function build_normal_wave()
 enemies={}
 local tpl=template_for_wave(wave)
 local slot=0
 for row=0,4 do
  local rowdef=tpl[row+1]
  for col=0,9 do
   local code=sub(rowdef,col+1,col+1)
   if code~="." then
    slot+=1
    add(enemies,spawn_wave_enemy(enemy_codes[code],row,col,slot))
   end
  end
 end
 challenge=false
 challenge_hits=0
 challenge_total=0
end

function build_challenge_wave()
 enemies={}
 challenge=true
 challenge_hits=0
 challenge_total=0
 local cycle_off=((wave/5)-1)%#challenge_cycle
 -- 5 groups of 4, staggered entry
 local patterns={1,2,3,4,1}
 -- rotate patterns based on wave
 local rot=flr(wave/5)%4
 for grp=0,4 do
  local pat=1+((grp+rot)%4)
  local dir=(grp%2==0) and 1 or -1
  local grp_delay=grp*80
  for j=0,3 do
   challenge_total+=1
   local kind=challenge_cycle[((challenge_total+cycle_off-1)%#challenge_cycle)+1]
   add(enemies,{
    kind=kind,
    row=j,
    col=grp,
    x=-20,
    y=-20,
    tx=64,
    ty=50,
    sx=0,
    sy=0,
    dir=dir,
    state="challenge",
    hp=1,
    t=-(grp_delay+j*8),
    anim=flr(rnd(60)),
    spawn_t=0,
    dive_kind=pat,
    shot_t=999,
    captured=false,
    beam_t=0
   })
  end
 end
end
