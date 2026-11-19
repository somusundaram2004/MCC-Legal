import{a as e}from"./rolldown-runtime-CNC7AqOf.js";import{Mt as t,i as n,jt as r,n as i,t as a}from"./Box-A2e9WhU8.js";import{t as o}from"./LottieAnimation-gAuhpxdl.js";import{t as s}from"./Close-rtgjXlG_.js";var c=e(t(),1),l={data:``},u=e=>{if(typeof window==`object`){let t=(e?e.querySelector(`#_goober`):window._goober)||Object.assign(document.createElement(`style`),{innerHTML:` `,id:`_goober`});return t.nonce=window.__nonce__,t.parentNode||(e||document.head).appendChild(t),t.firstChild}return e||l},d=/(?:([\u0080-\uFFFF\w-%@]+) *:? *([^{;]+?);|([^;}{]*?) *{)|(}\s*)/g,ee=/\/\*[^]*?\*\/|  +/g,f=/\n+/g,p=(e,t)=>{let n=``,r=``,i=``;for(let a in e){let o=e[a];a[0]==`@`?a[1]==`i`?n=a+` `+o+`;`:r+=a[1]==`f`?p(o,a):a+`{`+p(o,a[1]==`k`?``:t)+`}`:typeof o==`object`?r+=p(o,t?t.replace(/([^,])+/g,e=>a.replace(/([^,]*:\S+\([^)]*\))|([^,])+/g,t=>/&/.test(t)?t.replace(/&/g,e):e?e+` `+t:t)):a):o!=null&&(a=a[1]==`-`?a:a.replace(/[A-Z]/g,`-$&`).toLowerCase(),i+=p.p?p.p(a,o):a+`:`+o+`;`)}return n+(t&&i?t+`{`+i+`}`:i)+r},m={},h=e=>{if(typeof e==`object`){let t=``;for(let n in e)t+=n+h(e[n]);return t}return e},g=(e,t,n,r,i)=>{let a=h(e),o=m[a]||(m[a]=(e=>{let t=0,n=11;for(;t<e.length;)n=101*n+e.charCodeAt(t++)>>>0;return`go`+n})(a));if(!m[o]){let t=a===e?(e=>{let t,n,r=[{}];for(;t=d.exec(e.replace(ee,``));)t[4]?r.shift():t[3]?(n=t[3].replace(f,` `).trim(),r.unshift(r[0][n]=r[0][n]||{})):r[0][t[1]]=t[2].replace(f,` `).trim();return r[0]})(e):e;m[o]=p(i?{[`@keyframes `+o]:t}:t,n?``:`.`+o)}let s=n&&m.g;return n&&(m.g=m[o]),((e,t,n,r)=>{r?t.data=t.data.replace(r,e):t.data.indexOf(e)===-1&&(t.data=n?e+t.data:t.data+e)})(m[o],t,r,s),o},te=(e,t,n)=>e.reduce((e,r,i)=>{let a=t[i];if(a&&a.call){let e=a(n),t=e&&e.props&&e.props.className||/^go/.test(e)&&e;a=t?`.`+t:e&&typeof e==`object`?e.props?``:p(e,``):!1===e?``:e}return e+r+(a??``)},``);function _(e){let t=this||{},n=e.call?e(t.p):e;return g(n.unshift?n.raw?te(n,[].slice.call(arguments,1),t.p):n.reduce((e,n)=>Object.assign(e,n&&n.call?n(t.p):n),{}):n,u(t.target),t.g,t.o,t.k)}var v,y,b;_.bind({g:1});var x=_.bind({k:1});function S(e,t,n,r){p.p=t,v=e,y=n,b=r}function C(e,t){let n=this||{};return function(){let r=arguments;function i(a,o){let s=Object.assign({},a),c=s.className||i.className;n.p=Object.assign({theme:y&&y()},s),n.o=/go\d/.test(c),s.className=_.apply(n,r)+(c?` `+c:``),t&&(s.ref=o);let l=e;return e[0]&&(l=s.as||e,delete s.as),b&&l[0]&&b(s),v(l,s)}return t?t(i):i}}var ne=e=>typeof e==`function`,w=(e,t)=>ne(e)?e(t):e,re=(()=>{let e=0;return()=>(++e).toString()})(),T=(()=>{let e;return()=>{if(e===void 0&&typeof window<`u`){let t=matchMedia(`(prefers-reduced-motion: reduce)`);e=!t||t.matches}return e}})(),E=20,D=`default`,O=(e,t)=>{let{toastLimit:n}=e.settings;switch(t.type){case 0:return{...e,toasts:[t.toast,...e.toasts].slice(0,n)};case 1:return{...e,toasts:e.toasts.map(e=>e.id===t.toast.id?{...e,...t.toast}:e)};case 2:let{toast:r}=t;return O(e,{type:+!!e.toasts.find(e=>e.id===r.id),toast:r});case 3:let{toastId:i}=t;return{...e,toasts:e.toasts.map(e=>e.id===i||i===void 0?{...e,dismissed:!0,visible:!1}:e)};case 4:return t.toastId===void 0?{...e,toasts:[]}:{...e,toasts:e.toasts.filter(e=>e.id!==t.toastId)};case 5:return{...e,pausedAt:t.time};case 6:let a=t.time-(e.pausedAt||0);return{...e,pausedAt:void 0,toasts:e.toasts.map(e=>({...e,pauseDuration:e.pauseDuration+a}))}}},k=[],A={toasts:[],pausedAt:void 0,settings:{toastLimit:E}},j={},M=(e,t=D)=>{j[t]=O(j[t]||A,e),k.forEach(([e,n])=>{e===t&&n(j[t])})},N=e=>Object.keys(j).forEach(t=>M(e,t)),ie=e=>Object.keys(j).find(t=>j[t].toasts.some(t=>t.id===e)),P=(e=D)=>t=>{M(t,e)},F={blank:4e3,error:4e3,success:2e3,loading:1/0,custom:4e3},I=(e={},t=D)=>{let[n,r]=(0,c.useState)(j[t]||A),i=(0,c.useRef)(j[t]);(0,c.useEffect)(()=>(i.current!==j[t]&&r(j[t]),k.push([t,r]),()=>{let e=k.findIndex(([e])=>e===t);e>-1&&k.splice(e,1)}),[t]);let a=n.toasts.map(t=>({...e,...e[t.type],...t,removeDelay:t.removeDelay||e[t.type]?.removeDelay||e?.removeDelay,duration:t.duration||e[t.type]?.duration||e?.duration||F[t.type],style:{...e.style,...e[t.type]?.style,...t.style}}));return{...n,toasts:a}},L=(e,t=`blank`,n)=>({createdAt:Date.now(),visible:!0,dismissed:!1,type:t,ariaProps:{role:`status`,"aria-live":`polite`},message:e,pauseDuration:0,...n,id:n?.id||re()}),R=e=>(t,n)=>{let r=L(t,e,n);return P(r.toasterId||ie(r.id))({type:2,toast:r}),r.id},z=(e,t)=>R(`blank`)(e,t);z.error=R(`error`),z.success=R(`success`),z.loading=R(`loading`),z.custom=R(`custom`),z.dismiss=(e,t)=>{let n={type:3,toastId:e};t?P(t)(n):N(n)},z.dismissAll=e=>z.dismiss(void 0,e),z.remove=(e,t)=>{let n={type:4,toastId:e};t?P(t)(n):N(n)},z.removeAll=e=>z.remove(void 0,e),z.promise=(e,t,n)=>{let r=z.loading(t.loading,{...n,...n?.loading});return typeof e==`function`&&(e=e()),e.then(e=>{let i=t.success?w(t.success,e):void 0;return i?z.success(i,{id:r,...n,...n?.success}):z.dismiss(r),e}).catch(e=>{let i=t.error?w(t.error,e):void 0;i?z.error(i,{id:r,...n,...n?.error}):z.dismiss(r)}),e};var B=1e3,V=(e,t=`default`)=>{let{toasts:n,pausedAt:r}=I(e,t),i=(0,c.useRef)(new Map).current,a=(0,c.useCallback)((e,t=B)=>{if(i.has(e))return;let n=setTimeout(()=>{i.delete(e),o({type:4,toastId:e})},t);i.set(e,n)},[]);(0,c.useEffect)(()=>{if(r)return;let e=Date.now(),i=n.map(n=>{if(n.duration===1/0)return;let r=(n.duration||0)+n.pauseDuration-(e-n.createdAt);if(r<0){n.visible&&z.dismiss(n.id);return}return setTimeout(()=>z.dismiss(n.id,t),r)});return()=>{i.forEach(e=>e&&clearTimeout(e))}},[n,r,t]);let o=(0,c.useCallback)(P(t),[t]),s=(0,c.useCallback)(()=>{o({type:5,time:Date.now()})},[o]),l=(0,c.useCallback)((e,t)=>{o({type:1,toast:{id:e,height:t}})},[o]),u=(0,c.useCallback)(()=>{r&&o({type:6,time:Date.now()})},[r,o]),d=(0,c.useCallback)((e,t)=>{let{reverseOrder:r=!1,gutter:i=8,defaultPosition:a}=t||{},o=n.filter(t=>(t.position||a)===(e.position||a)&&t.height),s=o.findIndex(t=>t.id===e.id),c=o.filter((e,t)=>t<s&&e.visible).length;return o.filter(e=>e.visible).slice(...r?[c+1]:[0,c]).reduce((e,t)=>e+(t.height||0)+i,0)},[n]);return(0,c.useEffect)(()=>{n.forEach(e=>{if(e.dismissed)a(e.id,e.removeDelay);else{let t=i.get(e.id);t&&(clearTimeout(t),i.delete(e.id))}})},[n,a]),{toasts:n,handlers:{updateHeight:l,startPause:s,endPause:u,calculateOffset:d}}},H=x`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
 transform: scale(1) rotate(45deg);
  opacity: 1;
}`,U=x`
from {
  transform: scale(0);
  opacity: 0;
}
to {
  transform: scale(1);
  opacity: 1;
}`,W=x`
from {
  transform: scale(0) rotate(90deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(90deg);
	opacity: 1;
}`,G=C(`div`)`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||`#ff4b4b`};
  position: relative;
  transform: rotate(45deg);

  animation: ${H} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;

  &:after,
  &:before {
    content: '';
    animation: ${U} 0.15s ease-out forwards;
    animation-delay: 150ms;
    position: absolute;
    border-radius: 3px;
    opacity: 0;
    background: ${e=>e.secondary||`#fff`};
    bottom: 9px;
    left: 4px;
    height: 2px;
    width: 12px;
  }

  &:before {
    animation: ${W} 0.15s ease-out forwards;
    animation-delay: 180ms;
    transform: rotate(90deg);
  }
`,K=x`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`,q=C(`div`)`
  width: 12px;
  height: 12px;
  box-sizing: border-box;
  border: 2px solid;
  border-radius: 100%;
  border-color: ${e=>e.secondary||`#e0e0e0`};
  border-right-color: ${e=>e.primary||`#616161`};
  animation: ${K} 1s linear infinite;
`,J=x`
from {
  transform: scale(0) rotate(45deg);
	opacity: 0;
}
to {
  transform: scale(1) rotate(45deg);
	opacity: 1;
}`,Y=x`
0% {
	height: 0;
	width: 0;
	opacity: 0;
}
40% {
  height: 0;
	width: 6px;
	opacity: 1;
}
100% {
  opacity: 1;
  height: 10px;
}`,ae=C(`div`)`
  width: 20px;
  opacity: 0;
  height: 20px;
  border-radius: 10px;
  background: ${e=>e.primary||`#61d345`};
  position: relative;
  transform: rotate(45deg);

  animation: ${J} 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
  animation-delay: 100ms;
  &:after {
    content: '';
    box-sizing: border-box;
    animation: ${Y} 0.2s ease-out forwards;
    opacity: 0;
    animation-delay: 200ms;
    position: absolute;
    border-right: 2px solid;
    border-bottom: 2px solid;
    border-color: ${e=>e.secondary||`#fff`};
    bottom: 6px;
    left: 6px;
    height: 10px;
    width: 6px;
  }
`,oe=C(`div`)`
  position: absolute;
`,se=C(`div`)`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  min-width: 20px;
  min-height: 20px;
`,ce=x`
from {
  transform: scale(0.6);
  opacity: 0.4;
}
to {
  transform: scale(1);
  opacity: 1;
}`,le=C(`div`)`
  position: relative;
  transform: scale(0.6);
  opacity: 0.4;
  min-width: 20px;
  animation: ${ce} 0.3s 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275)
    forwards;
`,ue=({toast:e})=>{let{icon:t,type:n,iconTheme:r}=e;return t===void 0?n===`blank`?null:c.createElement(se,null,c.createElement(q,{...r}),n!==`loading`&&c.createElement(oe,null,n===`error`?c.createElement(G,{...r}):c.createElement(ae,{...r}))):typeof t==`string`?c.createElement(le,null,t):t},de=e=>`
0% {transform: translate3d(0,${e*-200}%,0) scale(.6); opacity:.5;}
100% {transform: translate3d(0,0,0) scale(1); opacity:1;}
`,fe=e=>`
0% {transform: translate3d(0,0,-1px) scale(1); opacity:1;}
100% {transform: translate3d(0,${e*-150}%,-1px) scale(.6); opacity:0;}
`,pe=`0%{opacity:0;} 100%{opacity:1;}`,me=`0%{opacity:1;} 100%{opacity:0;}`,he=C(`div`)`
  display: flex;
  align-items: center;
  background: #fff;
  color: #363636;
  line-height: 1.3;
  will-change: transform;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1), 0 3px 3px rgba(0, 0, 0, 0.05);
  max-width: 350px;
  pointer-events: auto;
  padding: 8px 10px;
  border-radius: 8px;
`,ge=C(`div`)`
  display: flex;
  justify-content: center;
  margin: 4px 10px;
  color: inherit;
  flex: 1 1 auto;
  white-space: pre-line;
`,_e=(e,t)=>{let n=e.includes(`top`)?1:-1,[r,i]=T()?[pe,me]:[de(n),fe(n)];return{animation:t?`${x(r)} 0.35s cubic-bezier(.21,1.02,.73,1) forwards`:`${x(i)} 0.4s forwards cubic-bezier(.06,.71,.55,1)`}},ve=c.memo(({toast:e,position:t,style:n,children:r})=>{let i=e.height?_e(e.position||t||`top-center`,e.visible):{opacity:0},a=c.createElement(ue,{toast:e}),o=c.createElement(ge,{...e.ariaProps},w(e.message,e));return c.createElement(he,{className:e.className,style:{...i,...n,...e.style}},typeof r==`function`?r({icon:a,message:o}):c.createElement(c.Fragment,null,a,o))});S(c.createElement);var ye=({id:e,className:t,style:n,onHeightUpdate:r,children:i})=>{let a=c.useCallback(t=>{if(t){let n=()=>{let n=t.getBoundingClientRect().height;r(e,n)};n(),new MutationObserver(n).observe(t,{subtree:!0,childList:!0,characterData:!0})}},[e,r]);return c.createElement(`div`,{ref:a,className:t,style:n},i)},be=(e,t)=>{let n=e.includes(`top`),r=n?{top:0}:{bottom:0},i=e.includes(`center`)?{justifyContent:`center`}:e.includes(`right`)?{justifyContent:`flex-end`}:{};return{left:0,right:0,display:`flex`,position:`absolute`,transition:T()?void 0:`all 230ms cubic-bezier(.21,1.02,.73,1)`,transform:`translateY(${t*(n?1:-1)}px)`,...r,...i}},xe=_`
  z-index: 9999;
  > * {
    pointer-events: auto;
  }
`,X=16,Se=({reverseOrder:e,position:t=`top-center`,toastOptions:n,gutter:r,children:i,toasterId:a,containerStyle:o,containerClassName:s})=>{let{toasts:l,handlers:u}=V(n,a);return c.createElement(`div`,{"data-rht-toaster":a||``,style:{position:`fixed`,zIndex:9999,top:X,left:X,right:X,bottom:X,pointerEvents:`none`,...o},className:s,onMouseEnter:u.startPause,onMouseLeave:u.endPause},l.map(n=>{let a=n.position||t,o=be(a,u.calculateOffset(n,{reverseOrder:e,gutter:r,defaultPosition:t}));return c.createElement(ye,{id:n.id,key:n.id,onHeightUpdate:u.updateHeight,className:n.visible?xe:``,style:o},n.type===`custom`?w(n.message,n):i?i(n):c.createElement(ve,{toast:n,position:a}))}))},Z=z,Q=r(),$=(e,t)=>{e===`success`?$.success(t):e===`delete`?$.delete(t):e===`email`?$.email(t):e===`approved`?$.approved(t):e===`error`?$.error(t):e===`warning`?$.warning(t):e===`info`?$.info(t):Z(t)};$.success=e=>{let t=(e||``).toLowerCase(),r=!e.includes(` `)||t.includes(`welcome`)||t.includes(`login`);Z.custom(c=>(0,Q.jsxs)(a,{className:c.visible?`animate-toast-in`:`animate-toast-out`,sx:{maxWidth:440,width:`100%`,bgcolor:`rgba(255, 255, 255, 0.98)`,backdropFilter:`blur(18px)`,border:`1.5px solid rgba(16, 185, 129, 0.35)`,borderRadius:`18px`,p:2,boxShadow:`0 20px 50px rgba(16, 185, 129, 0.22), 0 4px 12px rgba(0,0,0,0.06)`,display:`flex`,alignItems:`center`,gap:1.8},children:[(0,Q.jsx)(a,{sx:{width:44,height:44,borderRadius:`12px`,bgcolor:`rgba(16, 185, 129, 0.12)`,display:`flex`,alignItems:`center`,justifyContent:`center`,flexShrink:0,overflow:`hidden`},children:(0,Q.jsx)(o,{type:`success`,size:38,loop:!1})}),(0,Q.jsxs)(a,{sx:{flexGrow:1},children:[(0,Q.jsx)(i,{variant:`subtitle2`,sx:{fontWeight:800,color:`#059669`,fontSize:`0.95rem`,mb:.2},children:r?`Login Successful`:`Success`}),(0,Q.jsx)(i,{variant:`body2`,sx:{color:`#334155`,fontSize:`0.85rem`,fontWeight:600},children:r&&!t.includes(`welcome`)?`Welcome back, ${e}!`:e})]}),(0,Q.jsx)(n,{size:`small`,onClick:()=>Z.dismiss(c.id),sx:{color:`#94a3b8`,p:.5,"&:hover":{color:`#475569`}},children:(0,Q.jsx)(s,{fontSize:`small`})})]}),{duration:r?2200:3800})},$.approved=(e=`Agreement Approved`)=>{Z.custom(t=>(0,Q.jsxs)(a,{className:t.visible?`animate-toast-in`:`animate-toast-out`,sx:{maxWidth:440,width:`100%`,bgcolor:`rgba(255, 255, 255, 0.98)`,backdropFilter:`blur(18px)`,border:`1.5px solid rgba(16, 185, 129, 0.4)`,borderRadius:`18px`,p:2,boxShadow:`0 20px 50px rgba(16, 185, 129, 0.25), 0 4px 12px rgba(0,0,0,0.06)`,display:`flex`,alignItems:`center`,gap:1.8},children:[(0,Q.jsx)(a,{sx:{width:48,height:48,borderRadius:`14px`,bgcolor:`rgba(16, 185, 129, 0.15)`,display:`flex`,alignItems:`center`,justifyContent:`center`,flexShrink:0,overflow:`hidden`},children:(0,Q.jsx)(o,{type:`approved`,size:42,loop:!1})}),(0,Q.jsxs)(a,{sx:{flexGrow:1},children:[(0,Q.jsx)(i,{variant:`subtitle2`,sx:{fontWeight:800,color:`#059669`,fontSize:`0.98rem`,mb:.2},children:`MOU Approved & Active`}),(0,Q.jsx)(i,{variant:`body2`,sx:{color:`#334155`,fontSize:`0.85rem`,fontWeight:600},children:e})]}),(0,Q.jsx)(n,{size:`small`,onClick:()=>Z.dismiss(t.id),sx:{color:`#94a3b8`,p:.5,"&:hover":{color:`#475569`}},children:(0,Q.jsx)(s,{fontSize:`small`})})]}),{duration:4e3})},$.delete=(e=`Item moved to recycle bin`)=>{Z.custom(t=>(0,Q.jsxs)(a,{className:t.visible?`animate-toast-in`:`animate-toast-out`,sx:{maxWidth:440,width:`100%`,bgcolor:`rgba(255, 255, 255, 0.98)`,backdropFilter:`blur(18px)`,border:`1.5px solid rgba(239, 68, 68, 0.35)`,borderRadius:`18px`,p:2,boxShadow:`0 20px 50px rgba(239, 68, 68, 0.2), 0 4px 12px rgba(0,0,0,0.06)`,display:`flex`,alignItems:`center`,gap:1.8},children:[(0,Q.jsx)(a,{sx:{width:44,height:44,borderRadius:`12px`,bgcolor:`rgba(239, 68, 68, 0.12)`,display:`flex`,alignItems:`center`,justifyContent:`center`,flexShrink:0,overflow:`hidden`},children:(0,Q.jsx)(o,{type:`delete`,size:38,loop:!1})}),(0,Q.jsxs)(a,{sx:{flexGrow:1},children:[(0,Q.jsx)(i,{variant:`subtitle2`,sx:{fontWeight:800,color:`#dc2626`,fontSize:`0.95rem`,mb:.2},children:`Deleted`}),(0,Q.jsx)(i,{variant:`body2`,sx:{color:`#334155`,fontSize:`0.85rem`,fontWeight:600},children:e})]}),(0,Q.jsx)(n,{size:`small`,onClick:()=>Z.dismiss(t.id),sx:{color:`#94a3b8`,p:.5,"&:hover":{color:`#475569`}},children:(0,Q.jsx)(s,{fontSize:`small`})})]}),{duration:3800})},$.email=(e=`Email dispatched successfully`)=>{Z.custom(t=>(0,Q.jsxs)(a,{className:t.visible?`animate-toast-in`:`animate-toast-out`,sx:{maxWidth:440,width:`100%`,bgcolor:`rgba(255, 255, 255, 0.98)`,backdropFilter:`blur(18px)`,border:`1.5px solid rgba(59, 130, 246, 0.35)`,borderRadius:`18px`,p:2,boxShadow:`0 20px 50px rgba(59, 130, 246, 0.2), 0 4px 12px rgba(0,0,0,0.06)`,display:`flex`,alignItems:`center`,gap:1.8},children:[(0,Q.jsx)(a,{sx:{width:44,height:44,borderRadius:`12px`,bgcolor:`rgba(59, 130, 246, 0.12)`,display:`flex`,alignItems:`center`,justifyContent:`center`,flexShrink:0,overflow:`hidden`},children:(0,Q.jsx)(o,{type:`email`,size:38,loop:!1})}),(0,Q.jsxs)(a,{sx:{flexGrow:1},children:[(0,Q.jsx)(i,{variant:`subtitle2`,sx:{fontWeight:800,color:`#2563eb`,fontSize:`0.95rem`,mb:.2},children:`Email Sent`}),(0,Q.jsx)(i,{variant:`body2`,sx:{color:`#334155`,fontSize:`0.85rem`,fontWeight:600},children:e})]}),(0,Q.jsx)(n,{size:`small`,onClick:()=>Z.dismiss(t.id),sx:{color:`#94a3b8`,p:.5,"&:hover":{color:`#475569`}},children:(0,Q.jsx)(s,{fontSize:`small`})})]}),{duration:4e3})},$.error=e=>{Z.custom(t=>(0,Q.jsxs)(a,{className:t.visible?`animate-toast-in`:`animate-toast-out`,sx:{maxWidth:420,width:`100%`,bgcolor:`rgba(255, 255, 255, 0.98)`,backdropFilter:`blur(16px)`,border:`1px solid rgba(244, 63, 94, 0.3)`,borderRadius:`16px`,p:2,boxShadow:`0 20px 50px rgba(244, 63, 94, 0.15), 0 4px 12px rgba(0,0,0,0.05)`,display:`flex`,alignItems:`center`,gap:1.8},children:[(0,Q.jsx)(a,{sx:{width:40,height:40,borderRadius:`12px`,bgcolor:`rgba(244, 63, 94, 0.15)`,display:`flex`,alignItems:`center`,justifyContent:`center`,fontSize:`1.25rem`,flexShrink:0},children:`❌`}),(0,Q.jsxs)(a,{sx:{flexGrow:1},children:[(0,Q.jsx)(i,{variant:`subtitle2`,sx:{fontWeight:800,color:`#e11d48`,fontSize:`0.95rem`,mb:.2},children:`Error`}),(0,Q.jsx)(i,{variant:`body2`,sx:{color:`#334155`,fontSize:`0.85rem`,fontWeight:600},children:e||`An error occurred. Please try again.`})]}),(0,Q.jsx)(n,{size:`small`,onClick:()=>Z.dismiss(t.id),sx:{color:`#94a3b8`,p:.5,"&:hover":{color:`#475569`}},children:(0,Q.jsx)(s,{fontSize:`small`})})]}),{duration:4e3})},$.warning=(e=`Attention Required`)=>{Z.custom(t=>(0,Q.jsxs)(a,{className:t.visible?`animate-toast-in`:`animate-toast-out`,sx:{maxWidth:440,width:`100%`,bgcolor:`rgba(255, 255, 255, 0.98)`,backdropFilter:`blur(18px)`,border:`1.5px solid rgba(245, 158, 11, 0.4)`,borderRadius:`18px`,p:2,boxShadow:`0 20px 50px rgba(245, 158, 11, 0.2), 0 4px 12px rgba(0,0,0,0.06)`,display:`flex`,alignItems:`center`,gap:1.8},children:[(0,Q.jsx)(a,{sx:{width:44,height:44,borderRadius:`12px`,bgcolor:`rgba(245, 158, 11, 0.15)`,display:`flex`,alignItems:`center`,justifyContent:`center`,fontSize:`1.35rem`,flexShrink:0},children:`⚠️`}),(0,Q.jsxs)(a,{sx:{flexGrow:1},children:[(0,Q.jsx)(i,{variant:`subtitle2`,sx:{fontWeight:800,color:`#d97706`,fontSize:`0.95rem`,mb:.2},children:`Attention Required`}),(0,Q.jsx)(i,{variant:`body2`,sx:{color:`#334155`,fontSize:`0.85rem`,fontWeight:600},children:e})]}),(0,Q.jsx)(n,{size:`small`,onClick:()=>Z.dismiss(t.id),sx:{color:`#94a3b8`,p:.5,"&:hover":{color:`#475569`}},children:(0,Q.jsx)(s,{fontSize:`small`})})]}),{duration:5e3})},$.info=(e=`Information`)=>{Z.custom(t=>(0,Q.jsxs)(a,{className:t.visible?`animate-toast-in`:`animate-toast-out`,sx:{maxWidth:440,width:`100%`,bgcolor:`rgba(255, 255, 255, 0.98)`,backdropFilter:`blur(18px)`,border:`1.5px solid rgba(59, 130, 246, 0.4)`,borderRadius:`18px`,p:2,boxShadow:`0 20px 50px rgba(59, 130, 246, 0.2), 0 4px 12px rgba(0,0,0,0.06)`,display:`flex`,alignItems:`center`,gap:1.8},children:[(0,Q.jsx)(a,{sx:{width:44,height:44,borderRadius:`12px`,bgcolor:`rgba(59, 130, 246, 0.15)`,display:`flex`,alignItems:`center`,justifyContent:`center`,fontSize:`1.35rem`,flexShrink:0},children:`ℹ️`}),(0,Q.jsxs)(a,{sx:{flexGrow:1},children:[(0,Q.jsx)(i,{variant:`subtitle2`,sx:{fontWeight:800,color:`#2563eb`,fontSize:`0.95rem`,mb:.2},children:`Notice`}),(0,Q.jsx)(i,{variant:`body2`,sx:{color:`#334155`,fontSize:`0.85rem`,fontWeight:600},children:e})]}),(0,Q.jsx)(n,{size:`small`,onClick:()=>Z.dismiss(t.id),sx:{color:`#94a3b8`,p:.5,"&:hover":{color:`#475569`}},children:(0,Q.jsx)(s,{fontSize:`small`})})]}),{duration:4e3})},$.invalidCredentials=e=>{Z.custom(t=>(0,Q.jsxs)(a,{className:t.visible?`animate-toast-in`:`animate-toast-out`,sx:{maxWidth:420,width:`100%`,bgcolor:`rgba(255, 255, 255, 0.96)`,backdropFilter:`blur(16px)`,border:`1px solid rgba(239, 68, 68, 0.25)`,borderRadius:`16px`,p:2.2,boxShadow:`0 20px 50px rgba(239, 68, 68, 0.18), 0 4px 12px rgba(0,0,0,0.05)`,display:`flex`,alignItems:`flex-start`,gap:1.8,position:`relative`},children:[(0,Q.jsx)(a,{sx:{width:40,height:40,borderRadius:`12px`,bgcolor:`rgba(239, 68, 68, 0.12)`,display:`flex`,alignItems:`center`,justifyContent:`center`,fontSize:`1.25rem`,flexShrink:0},children:`❌`}),(0,Q.jsxs)(a,{sx:{flexGrow:1,pr:1},children:[(0,Q.jsx)(i,{variant:`subtitle2`,sx:{fontWeight:800,color:`#ef4444`,fontSize:`0.95rem`,mb:.3},children:`Login Failed`}),(0,Q.jsx)(i,{variant:`body2`,sx:{color:`#475569`,fontSize:`0.85rem`,lineHeight:1.45,fontWeight:500},children:e||`Incorrect password. If you don't know your password, please click Forgot Password.`})]}),(0,Q.jsx)(n,{size:`small`,onClick:()=>Z.dismiss(t.id),sx:{color:`#94a3b8`,p:.5,"&:hover":{color:`#475569`}},children:(0,Q.jsx)(s,{fontSize:`small`})})]}),{duration:5e3})},$.googleError=e=>{Z.custom(t=>(0,Q.jsxs)(a,{className:t.visible?`animate-toast-in`:`animate-toast-out`,sx:{maxWidth:420,width:`100%`,bgcolor:`rgba(255, 255, 255, 0.96)`,backdropFilter:`blur(16px)`,border:`1px solid rgba(239, 68, 68, 0.25)`,borderRadius:`16px`,p:2.2,boxShadow:`0 20px 50px rgba(239, 68, 68, 0.18), 0 4px 12px rgba(0,0,0,0.05)`,display:`flex`,alignItems:`flex-start`,gap:1.8,position:`relative`},children:[(0,Q.jsx)(a,{sx:{width:40,height:40,borderRadius:`12px`,bgcolor:`rgba(239, 68, 68, 0.12)`,display:`flex`,alignItems:`center`,justifyContent:`center`,fontSize:`1.25rem`,flexShrink:0},children:`❌`}),(0,Q.jsxs)(a,{sx:{flexGrow:1,pr:1},children:[(0,Q.jsx)(i,{variant:`subtitle2`,sx:{fontWeight:800,color:`#ef4444`,fontSize:`0.95rem`,mb:.3},children:`Google Sign-in Failed`}),(0,Q.jsx)(i,{variant:`body2`,sx:{color:`#475569`,fontSize:`0.85rem`,lineHeight:1.45,fontWeight:500},children:e||`Unable to sign in with Google. Please try again later or use your email and password.`})]}),(0,Q.jsx)(n,{size:`small`,onClick:()=>Z.dismiss(t.id),sx:{color:`#94a3b8`,p:.5,"&:hover":{color:`#475569`}},children:(0,Q.jsx)(s,{fontSize:`small`})})]}),{duration:4e3})},$.networkError=()=>{Z.custom(e=>(0,Q.jsxs)(a,{className:e.visible?`animate-toast-in`:`animate-toast-out`,sx:{maxWidth:420,width:`100%`,bgcolor:`rgba(255, 255, 255, 0.96)`,backdropFilter:`blur(16px)`,border:`1px solid rgba(59, 130, 246, 0.25)`,borderRadius:`16px`,p:2.2,boxShadow:`0 20px 50px rgba(59, 130, 246, 0.18), 0 4px 12px rgba(0,0,0,0.05)`,display:`flex`,alignItems:`flex-start`,gap:1.8,position:`relative`},children:[(0,Q.jsx)(a,{sx:{width:40,height:40,borderRadius:`12px`,bgcolor:`rgba(59, 130, 246, 0.12)`,display:`flex`,alignItems:`center`,justifyContent:`center`,fontSize:`1.25rem`,flexShrink:0},children:`🌐`}),(0,Q.jsxs)(a,{sx:{flexGrow:1,pr:1},children:[(0,Q.jsx)(i,{variant:`subtitle2`,sx:{fontWeight:800,color:`#2563eb`,fontSize:`0.95rem`,mb:.3},children:`Connection Error`}),(0,Q.jsxs)(i,{variant:`body2`,sx:{color:`#475569`,fontSize:`0.85rem`,lineHeight:1.45,fontWeight:500},children:[`Unable to connect to the server.`,(0,Q.jsx)(`br`,{}),`Please check your internet connection.`]})]}),(0,Q.jsx)(n,{size:`small`,onClick:()=>Z.dismiss(e.id),sx:{color:`#94a3b8`,p:.5,"&:hover":{color:`#475569`}},children:(0,Q.jsx)(s,{fontSize:`small`})})]}),{duration:4e3})},$.serverError=()=>{Z.custom(e=>(0,Q.jsxs)(a,{className:e.visible?`animate-toast-in`:`animate-toast-out`,sx:{maxWidth:420,width:`100%`,bgcolor:`rgba(255, 255, 255, 0.96)`,backdropFilter:`blur(16px)`,border:`1px solid rgba(245, 158, 11, 0.25)`,borderRadius:`16px`,p:2.2,boxShadow:`0 20px 50px rgba(245, 158, 11, 0.18), 0 4px 12px rgba(0,0,0,0.05)`,display:`flex`,alignItems:`flex-start`,gap:1.8,position:`relative`},children:[(0,Q.jsx)(a,{sx:{width:40,height:40,borderRadius:`12px`,bgcolor:`rgba(245, 158, 11, 0.12)`,display:`flex`,alignItems:`center`,justifyContent:`center`,fontSize:`1.25rem`,flexShrink:0},children:`⚠`}),(0,Q.jsxs)(a,{sx:{flexGrow:1,pr:1},children:[(0,Q.jsx)(i,{variant:`subtitle2`,sx:{fontWeight:800,color:`#d97706`,fontSize:`0.95rem`,mb:.3},children:`Server Error`}),(0,Q.jsxs)(i,{variant:`body2`,sx:{color:`#475569`,fontSize:`0.85rem`,lineHeight:1.45,fontWeight:500},children:[`Something went wrong.`,(0,Q.jsx)(`br`,{}),`Please try again later.`]})]}),(0,Q.jsx)(n,{size:`small`,onClick:()=>Z.dismiss(e.id),sx:{color:`#94a3b8`,p:.5,"&:hover":{color:`#475569`}},children:(0,Q.jsx)(s,{fontSize:`small`})})]}),{duration:4e3})};var Ce=$;export{Se as n,Ce as t};