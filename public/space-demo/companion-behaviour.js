(function (root) {
  'use strict';
  const powerProfiles = [
    {name:'Low power',amplitude:3,period:9,fps:6},
    {name:'Automatic',amplitude:7,period:5.5,fps:12},
    {name:'High power',amplitude:14,period:2.8,fps:12}
  ];
  const afkDelay = 5000;
  function flightPose(seconds, power = 1, charging = false) {
    const profile = powerProfiles[power] || powerProfiles[1];
    const phase = seconds * Math.PI * 2 / profile.period;
    const amplitude = charging ? 0 : profile.amplitude;
    const cat = {x:38 + Math.sin(phase - .7) * amplitude, y:23 + Math.cos(phase * .8) * amplitude * .45};
    const ship = {x:151 + Math.sin(phase) * amplitude, y:(charging ? 52 : 31) + Math.cos(phase * 1.1) * amplitude * .55};
    const start = {x:cat.x + 57,y:cat.y + 44};
    const end = {x:ship.x + 3,y:ship.y + 35};
    const cord = `M${start.x} ${start.y} Q${(start.x + end.x) / 2} ${Math.max(start.y,end.y) + 16} ${end.x} ${end.y}`;
    return {cat,ship,cord,flame:charging ? 0 : 3 + power * 3 + (Math.sin(phase * 4) + 1) * 2};
  }
  function createCountdown() {
    let deadline = null;
    return {
      start(now) { deadline = now + afkDelay; },
      cancel() { deadline = null; },
      active() { return deadline !== null; },
      remaining(now) { return deadline === null ? 0 : Math.max(0,Math.ceil((deadline - now) / 1000)); },
      due(now) { return deadline !== null && now >= deadline; }
    };
  }
  function cycle(values, current, delta) {
    const index = Math.max(0,values.indexOf(current));
    return values[(index + delta + values.length) % values.length];
  }
  root.CompanionBehaviour = {powerProfiles,afkDelay,flightPose,createCountdown,cycle};
})(globalThis);
