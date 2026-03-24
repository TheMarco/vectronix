screen_w=128
screen_h=128
field_l=8
field_r=120
field_t=10
field_b=122
player_y=116
formation_x=19
formation_y=18
formation_dx=10
formation_dy=10

enemy_codes={
 g="grunt",
 a="attacker",
 c="commander",
 s="spinner",
 b="bomber",
 d="guardian",
 p="phantom",
 w="swarm",
 o="boss"
}

enemy_defs={
 grunt={spr={2,3},w=1,h=1,hp=1,score=50,dive_score=100,shot="straight",speed=1.0},
 attacker={spr={4,5},w=1,h=1,hp=1,score=80,dive_score=160,shot="aim",speed=1.15},
 commander={spr={6,7,8},w=1,h=1,hp=2,score=250,dive_score=600,shot="spread",speed=0.95},
 spinner={spr={9,10,11,12},w=1,h=1,hp=1,score=100,dive_score=200,shot="straight",speed=1.1},
 bomber={spr={13,14,15},w=1,h=1,hp=2,score=200,dive_score=500,shot="bomb",speed=0.9},
 guardian={spr={16,17,18,19},w=1,h=1,hp=3,score=400,dive_score=800,shot="none",speed=0.8},
 phantom={spr={20,21,22,23},w=1,h=1,hp=1,score=160,dive_score=350,shot="straight",speed=1.05},
 swarm={spr={24,25},w=1,h=1,hp=1,score=30,dive_score=60,shot="straight",speed=1.35},
 boss={spr={38,39,40,41},w=1,h=1,hp=2,score=400,dive_score=800,shot="boss",speed=0.85}
}

player_frames={0,1}
ufo_frames={26,27}
fx_sprs={
 player_bullet=28,
 enemy_bullet=29,
 burst={30,31,32},
 rapid=33,
 shield=34,
 slow=35,
 magnet=36,
 freeze=37
}

power_order={"extra","rapid","shield","slow","magnet","freeze"}
power_icons={
 extra=player_frames[1],
 rapid=fx_sprs.rapid,
 shield=fx_sprs.shield,
 slow=fx_sprs.slow,
 magnet=fx_sprs.magnet,
 freeze=fx_sprs.freeze
}

challenge_cycle={"grunt","attacker","spinner","phantom","swarm","bomber","guardian"}

function clamp(v,a,b)
 if v<a then return a end
 if v>b then return b end
 return v
end

function lerp(a,b,t)
 return a+(b-a)*t
end

function dist2(x1,y1,x2,y2)
 local dx=x2-x1
 local dy=y2-y1
 return dx*dx+dy*dy
end

function seg_point_dist2(ax,ay,bx,by,px,py)
 local abx=bx-ax
 local aby=by-ay
 local ab2=abx*abx+aby*aby
 if ab2<=0 then
  return dist2(ax,ay,px,py)
 end
 local t=((px-ax)*abx+(py-ay)*aby)/ab2
 t=clamp(t,0,1)
 local cx=ax+abx*t
 local cy=ay+aby*t
 return dist2(cx,cy,px,py)
end

function enemy_slot_xy(row,col)
 local sway=sin(form_t/240+row*0.03)*6
 local bob=sin((form_t+col*9)/200)*1.5
 return formation_x+col*formation_dx+sway,formation_y+row*formation_dy+bob
end

function add_score(pts)
 score_lo+=pts
 while score_lo>=1000 do
  score_lo-=1000
  score_hi+=1
 end
 if demo_mode then return end
 if score_hi>hi_hi or (score_hi==hi_hi and score_lo>hi_lo) then
  hi_hi=score_hi
  hi_lo=score_lo
  if save_hi_score then
   save_hi_score()
  end
 end
 if check_extra_life_reward then
  check_extra_life_reward()
 end
end

function score_str(h,l)
 if h>0 then
  local s=tostr(l)
  while #s<3 do s="0"..s end
  return tostr(h)..s
 end
 return tostr(l)
end

function make_stars()
 stars={}
 for i=1,24 do
  add(stars,{
   x=rnd(screen_w),
   y=rnd(screen_h),
   spd=0.2+rnd(0.8),
   col=(i%3==0) and 6 or 5
  })
 end
end
