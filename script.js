/* Coordinates use the 360 × 220 SVG viewBox. CSS scaling automatically scales
   both the vehicles and their travel on desktop, tablet and mobile. */
const CONFIG = Object.freeze({
  totalDuration: 3, initialDuration: .5, approachDuration: .7,
  impactDuration: .12, recoilDuration: .28, settleDuration: .6,
  finalPositionDuration: .5, truckApproachX: 18, carApproachX: -18,
  recoilDistance: 12, finalGapPerVehicle: 6, bounceHeight: 6,
  impactRotation: 2, smokeDuration: .95, particleDuration: .5
});

(() => {
  'use strict';
  const art = document.querySelector('.art');
  // Guard against repeated initialization. Resize/scroll never starts motion.
  if (art.dataset.initialized) return;
  art.dataset.initialized = 'true';
  const truck = document.querySelector('#truck-motion');
  const car = document.querySelector('#car-motion');
  const effects = document.querySelector('.effects');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const finalTruckX = CONFIG.truckApproachX - CONFIG.finalGapPerVehicle;
  const finalCarX = CONFIG.carApproachX + CONFIG.finalGapPerVehicle;
  let tl;
  function staticFinal() {
    tl?.pause();
    tl?.kill();
    truck.setAttribute('transform', `translate(${finalTruckX} 0)`);
    car.setAttribute('transform', `translate(${finalCarX} 0)`);
    truck.style.transform = car.style.transform = '';
    effects.style.opacity = '0';
    document.querySelector('#speed-lines').style.opacity = '0';
    if (window.gsap) {
      gsap.set([truck, car], {clearProps: 'transform'});
      gsap.set(truck, {x: finalTruckX, y: 0, rotation: 0, scale: 1});
      gsap.set(car, {x: finalCarX, y: 0, rotation: 0, scale: 1});
      gsap.set(['#truck-body', '#car-body'], {x: 0, rotation: 0, y: 0, scale: 1});
      gsap.set('.effects', {opacity: 0});
    }
    art.dataset.state = reduced.matches ? 'reduced-motion' : 'complete';
  }
  function initialize() {
    if (reduced.matches || !window.gsap) {staticFinal(); return;}
    const truckWheels = ['#truck-wheel-front', '#truck-wheel-rear'];
    const carWheels = ['#car-wheel-front', '#car-wheel-rear'];
    const particles = ['#particle-1','#particle-2','#particle-3','#particle-4'];
    const smoke = ['#smoke-1','#smoke-2','#smoke-3','#smoke-4'];
    gsap.set([...truckWheels,...carWheels], {transformOrigin:'50% 50%'});
    gsap.set([truck,car], {transformOrigin:'50% 90%'});
    gsap.set(['#truck-body','#car-body'], {transformOrigin:'50% 100%'});
    gsap.set(['#impact-lines','#impact-star',...particles,...smoke], {opacity:0, transformOrigin:'50% 50%'});
    const t = {approach: CONFIG.initialDuration};
    t.impact = t.approach + CONFIG.approachDuration;
    t.recoil = t.impact + CONFIG.impactDuration;
    t.settle = t.recoil + CONFIG.recoilDuration;
    t.final = t.settle + CONFIG.settleDuration;
    t.hold = t.final + CONFIG.finalPositionDuration;
    tl = gsap.timeline({repeat:0, onComplete:() => {art.dataset.state='complete';}});
    // Read-only inspection aid for integration and timing QA; never auto-replayed.
    window.carHistoryMotion = {timeline:tl, config:CONFIG};
    art.dataset.state = 'running';
    Object.entries(t).forEach(([label,time])=>tl.addLabel(label,time));
    tl.addLabel('end',CONFIG.totalDuration);
    tl.to(truck,{x:CONFIG.truckApproachX,duration:CONFIG.approachDuration,ease:'power2.in'},'approach')
      .to(car,{x:CONFIG.carApproachX,duration:CONFIG.approachDuration,ease:'power2.in'},'approach')
      .to(truckWheels,{rotation:65,duration:CONFIG.approachDuration,ease:'power2.in'},'approach')
      .to(carWheels,{rotation:-80,duration:CONFIG.approachDuration,ease:'power2.in'},'approach')
      .to('#speed-lines',{opacity:.55,duration:.16},'approach')
      .to('#speed-lines',{opacity:0,duration:.09},'impact')
      .set(effects,{opacity:1},'impact')
      .fromTo(['#impact-lines','#impact-star'],{opacity:0,scale:.55},{opacity:1,scale:1.15,duration:.045},'impact')
      .to(['#impact-lines','#impact-star'],{opacity:0,scale:1.3,duration:.155},'impact+=0.045')
      .to('#truck-body',{scaleX:.97,scaleY:1.025,rotation:CONFIG.impactRotation,x:-1.8,duration:.04},'impact')
      .to('#car-body',{scaleX:.96,scaleY:1.03,rotation:-CONFIG.impactRotation,x:1.8,duration:.04},'impact')
      .to('#truck-body',{x:1,rotation:-1,duration:.04},'impact+=0.04')
      .to('#car-body',{x:-1,rotation:1,duration:.04},'impact+=0.04')
      .to(['#truck-body','#car-body'],{x:0,rotation:0,scale:1,duration:.04},'impact+=0.08');
    const vectors=[[-18,-28],[18,-34],[28,-9],[-16,8]];
    particles.forEach((particle,i)=>{
      tl.fromTo(particle,{opacity:0,scale:.7},{opacity:1,duration:.04},'recoil')
        .to(particle,{opacity:0,scale:1.1,x:vectors[i][0],y:vectors[i][1],rotation:i%2?65:-40,duration:CONFIG.particleDuration,ease:'power2.out'},t.recoil+.04);
    });
    smoke.forEach((p,i)=>{
      const start=t.recoil+i*.055;
      tl.fromTo(p,{opacity:0,scale:.4,y:8},{opacity:.65,scale:1,duration:.18,ease:'sine.out'},start)
        .to(p,{opacity:0,scale:1.25,y:-24-i*4,x:-i*2,duration:CONFIG.smokeDuration-.18,ease:'sine.out'},start+.18);
    });
    // Whole-vehicle recoil keeps the wheels attached during the tilt.
    tl.to(truck,{x:CONFIG.truckApproachX-CONFIG.recoilDistance,y:-CONFIG.bounceHeight,rotation:-5,duration:CONFIG.recoilDuration,ease:'power2.out'},'recoil')
      .to(car,{x:CONFIG.carApproachX+CONFIG.recoilDistance,y:-3,rotation:4,duration:CONFIG.recoilDuration,ease:'power2.out'},'recoil')
      .to(truckWheels,{rotation:23,duration:CONFIG.recoilDuration,ease:'power2.out'},'recoil')
      .to(carWheels,{rotation:-27,duration:CONFIG.recoilDuration,ease:'power2.out'},'recoil')
      .to([truck,car],{y:0,rotation:0,duration:CONFIG.settleDuration,ease:'power2.inOut'},'settle')
      .to(truck,{x:finalTruckX,duration:CONFIG.settleDuration,ease:'sine.inOut'},'settle')
      .to(car,{x:finalCarX,duration:CONFIG.settleDuration,ease:'sine.inOut'},'settle')
      .set(effects,{opacity:0},t.final+CONFIG.finalPositionDuration)
      .to({}, {duration:Math.max(0,CONFIG.totalDuration-t.hold)},'hold');
  }
  // Load event occurs once. Returning from bfcache or resizing never restarts it.
  if(document.readyState==='complete') initialize();
  else window.addEventListener('load',initialize,{once:true});
  reduced.addEventListener('change', e => {if(e.matches) staticFinal();});

  const form=document.querySelector('#lookup');
  const input=document.querySelector('#vehicle-number');
  const message=document.querySelector('.lookup-message');
  form.addEventListener('change',()=>{
    const vin=form.elements.type.value==='vin';
    input.setAttribute('aria-label',vin?'차대번호':'차량번호');
    input.placeholder=vin?'17자리 차대번호를 입력해주세요.':'띄어쓰기 없이 차량번호를 입력해주세요. 123가1234';
    message.textContent='';
  });
  form.addEventListener('submit',e=>{e.preventDefault();message.textContent='모션 확인용 화면입니다. 실제 차량 조회는 제공하지 않습니다.';});
  const dialog=document.querySelector('#demo-dialog');
  document.querySelectorAll('[data-demo]').forEach(button=>button.addEventListener('click',()=>{
    dialog.querySelector('h2').textContent=button.dataset.demo;
    dialog.showModal();
  }));
})();

