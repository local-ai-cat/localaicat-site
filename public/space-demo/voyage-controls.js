// Website throttle: one clock for travel, fuel, terrain and the crew.
(function(root){
const profiles=Object.freeze([
 Object.freeze({name:'Low',rate:2,energyMode:'lowPower'}),
 Object.freeze({name:'Medium',rate:4,energyMode:'automatic'}),
 Object.freeze({name:'High',rate:8,energyMode:'highPower'})
]);
function profile(index){return profiles[Number.isInteger(index)?index:-1]||profiles[1];}
function advance(elapsed,anchor,rate,wallTime,running=true){
 return elapsed+(running?Math.max(0,wallTime-anchor)/1000*rate:0);
}
function retime(elapsed,anchor,rate,wallTime,running,index){
 return {elapsed:advance(elapsed,anchor,rate,wallTime,running),anchor:wallTime,...profile(index)};
}
root.SpaceVoyageControls={profiles,profile,advance,retime};
})(globalThis);
