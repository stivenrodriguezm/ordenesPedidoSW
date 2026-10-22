import{R as Ne,j as r,r as b,B as G,p as Me,bb as Pe,_ as ke,s as De,a3 as le,bx as Oe}from"./index-C5EeG9ac.js";import{M as Se}from"./Modal-BGw6fAVj.js";import{f as _e}from"./formatCOP-yhuxI7nV.js";import{p as ue,g as Ee}from"./dates-CiDIK8D2.js";/* empty css                           */const me=6048e5,We=864e5,ne=Symbol.for("constructDateFrom");function O(e,n){return typeof e=="function"?e(n):e&&typeof e=="object"&&ne in e?e[ne](n):e instanceof Date?new e.constructor(n):new Date(n)}function M(e,n){return O(n||e,e)}function Cn(e,n,t){const a=M(e,t==null?void 0:t.in);return isNaN(n)?O(e,NaN):(n&&a.setDate(a.getDate()+n),a)}let Ce={};function V(){return Ce}function L(e,n){var d,u,m,p;const t=V(),a=(n==null?void 0:n.weekStartsOn)??((u=(d=n==null?void 0:n.locale)==null?void 0:d.options)==null?void 0:u.weekStartsOn)??t.weekStartsOn??((p=(m=t.locale)==null?void 0:m.options)==null?void 0:p.weekStartsOn)??0,i=M(e,n==null?void 0:n.in),o=i.getDay(),c=(o<a?7:0)+o-a;return i.setDate(i.getDate()-c),i.setHours(0,0,0,0),i}function X(e,n){return L(e,{...n,weekStartsOn:1})}function he(e,n){const t=M(e,n==null?void 0:n.in),a=t.getFullYear(),i=O(t,0);i.setFullYear(a+1,0,4),i.setHours(0,0,0,0);const o=X(i),c=O(t,0);c.setFullYear(a,0,4),c.setHours(0,0,0,0);const d=X(c);return t.getTime()>=o.getTime()?a+1:t.getTime()>=d.getTime()?a:a-1}function ae(e){const n=M(e),t=new Date(Date.UTC(n.getFullYear(),n.getMonth(),n.getDate(),n.getHours(),n.getMinutes(),n.getSeconds(),n.getMilliseconds()));return t.setUTCFullYear(n.getFullYear()),+e-+t}function Te(e,...n){const t=O.bind(null,n.find(a=>typeof a=="object"));return n.map(t)}function re(e,n){const t=M(e,n==null?void 0:n.in);return t.setHours(0,0,0,0),t}function $e(e,n,t){const[a,i]=Te(t==null?void 0:t.in,e,n),o=re(a),c=re(i),d=+o-ae(o),u=+c-ae(c);return Math.round((d-u)/We)}function Re(e,n){const t=he(e,n),a=O(e,0);return a.setFullYear(t,0,4),a.setHours(0,0,0,0),X(a)}function Fe(e){return e instanceof Date||typeof e=="object"&&Object.prototype.toString.call(e)==="[object Date]"}function Ye(e){return!(!Fe(e)&&typeof e!="number"||isNaN(+M(e)))}function ze(e,n){const t=M(e,n==null?void 0:n.in);return t.setFullYear(t.getFullYear(),0,1),t.setHours(0,0,0,0),t}const Ae={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},Le=(e,n,t)=>{let a;const i=Ae[e];return typeof i=="string"?a=i:n===1?a=i.one:a=i.other.replace("{{count}}",n.toString()),t!=null&&t.addSuffix?t.comparison&&t.comparison>0?"in "+a:a+" ago":a};function R(e){return(n={})=>{const t=n.width?String(n.width):e.defaultWidth;return e.formats[t]||e.formats[e.defaultWidth]}}const He={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},qe={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},Ie={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},Xe={date:R({formats:He,defaultWidth:"full"}),time:R({formats:qe,defaultWidth:"full"}),dateTime:R({formats:Ie,defaultWidth:"full"})},Ve={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},Qe=(e,n,t,a)=>Ve[e];function k(e){return(n,t)=>{const a=t!=null&&t.context?String(t.context):"standalone";let i;if(a==="formatting"&&e.formattingValues){const c=e.defaultFormattingWidth||e.defaultWidth,d=t!=null&&t.width?String(t.width):c;i=e.formattingValues[d]||e.formattingValues[c]}else{const c=e.defaultWidth,d=t!=null&&t.width?String(t.width):e.defaultWidth;i=e.values[d]||e.values[c]}const o=e.argumentCallback?e.argumentCallback(n):n;return i[o]}}const Be={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},Ge={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},Je={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},Ue={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},Ke={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},Ze={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},et=(e,n)=>{const t=Number(e),a=t%100;if(a>20||a<10)switch(a%10){case 1:return t+"st";case 2:return t+"nd";case 3:return t+"rd"}return t+"th"},tt={ordinalNumber:et,era:k({values:Be,defaultWidth:"wide"}),quarter:k({values:Ge,defaultWidth:"wide",argumentCallback:e=>e-1}),month:k({values:Je,defaultWidth:"wide"}),day:k({values:Ue,defaultWidth:"wide"}),dayPeriod:k({values:Ke,defaultWidth:"wide",formattingValues:Ze,defaultFormattingWidth:"wide"})};function D(e){return(n,t={})=>{const a=t.width,i=a&&e.matchPatterns[a]||e.matchPatterns[e.defaultMatchWidth],o=n.match(i);if(!o)return null;const c=o[0],d=a&&e.parsePatterns[a]||e.parsePatterns[e.defaultParseWidth],u=Array.isArray(d)?at(d,x=>x.test(c)):nt(d,x=>x.test(c));let m;m=e.valueCallback?e.valueCallback(u):u,m=t.valueCallback?t.valueCallback(m):m;const p=n.slice(c.length);return{value:m,rest:p}}}function nt(e,n){for(const t in e)if(Object.prototype.hasOwnProperty.call(e,t)&&n(e[t]))return t}function at(e,n){for(let t=0;t<e.length;t++)if(n(e[t]))return t}function fe(e){return(n,t={})=>{const a=n.match(e.matchPattern);if(!a)return null;const i=a[0],o=n.match(e.parsePattern);if(!o)return null;let c=e.valueCallback?e.valueCallback(o[0]):o[0];c=t.valueCallback?t.valueCallback(c):c;const d=n.slice(i.length);return{value:c,rest:d}}}const rt=/^(\d+)(th|st|nd|rd)?/i,it=/\d+/i,ot={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},st={any:[/^b/i,/^(a|c)/i]},ct={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},dt={any:[/1/i,/2/i,/3/i,/4/i]},lt={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},ut={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},mt={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},ht={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},ft={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},gt={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},bt={ordinalNumber:fe({matchPattern:rt,parsePattern:it,valueCallback:e=>parseInt(e,10)}),era:D({matchPatterns:ot,defaultMatchWidth:"wide",parsePatterns:st,defaultParseWidth:"any"}),quarter:D({matchPatterns:ct,defaultMatchWidth:"wide",parsePatterns:dt,defaultParseWidth:"any",valueCallback:e=>e+1}),month:D({matchPatterns:lt,defaultMatchWidth:"wide",parsePatterns:ut,defaultParseWidth:"any"}),day:D({matchPatterns:mt,defaultMatchWidth:"wide",parsePatterns:ht,defaultParseWidth:"any"}),dayPeriod:D({matchPatterns:ft,defaultMatchWidth:"any",parsePatterns:gt,defaultParseWidth:"any"})},pt={code:"en-US",formatDistance:Le,formatLong:Xe,formatRelative:Qe,localize:tt,match:bt,options:{weekStartsOn:0,firstWeekContainsDate:1}};function xt(e,n){const t=M(e,n==null?void 0:n.in);return $e(t,ze(t))+1}function wt(e,n){const t=M(e,n==null?void 0:n.in),a=+X(t)-+Re(t);return Math.round(a/me)+1}function ge(e,n){var p,x,N,v;const t=M(e,n==null?void 0:n.in),a=t.getFullYear(),i=V(),o=(n==null?void 0:n.firstWeekContainsDate)??((x=(p=n==null?void 0:n.locale)==null?void 0:p.options)==null?void 0:x.firstWeekContainsDate)??i.firstWeekContainsDate??((v=(N=i.locale)==null?void 0:N.options)==null?void 0:v.firstWeekContainsDate)??1,c=O((n==null?void 0:n.in)||e,0);c.setFullYear(a+1,0,o),c.setHours(0,0,0,0);const d=L(c,n),u=O((n==null?void 0:n.in)||e,0);u.setFullYear(a,0,o),u.setHours(0,0,0,0);const m=L(u,n);return+t>=+d?a+1:+t>=+m?a:a-1}function yt(e,n){var d,u,m,p;const t=V(),a=(n==null?void 0:n.firstWeekContainsDate)??((u=(d=n==null?void 0:n.locale)==null?void 0:d.options)==null?void 0:u.firstWeekContainsDate)??t.firstWeekContainsDate??((p=(m=t.locale)==null?void 0:m.options)==null?void 0:p.firstWeekContainsDate)??1,i=ge(e,n),o=O((n==null?void 0:n.in)||e,0);return o.setFullYear(i,0,a),o.setHours(0,0,0,0),L(o,n)}function vt(e,n){const t=M(e,n==null?void 0:n.in),a=+L(t,n)-+yt(t,n);return Math.round(a/me)+1}function l(e,n){const t=e<0?"-":"",a=Math.abs(e).toString().padStart(n,"0");return t+a}const _={y(e,n){const t=e.getFullYear(),a=t>0?t:1-t;return l(n==="yy"?a%100:a,n.length)},M(e,n){const t=e.getMonth();return n==="M"?String(t+1):l(t+1,2)},d(e,n){return l(e.getDate(),n.length)},a(e,n){const t=e.getHours()/12>=1?"pm":"am";switch(n){case"a":case"aa":return t.toUpperCase();case"aaa":return t;case"aaaaa":return t[0];case"aaaa":default:return t==="am"?"a.m.":"p.m."}},h(e,n){return l(e.getHours()%12||12,n.length)},H(e,n){return l(e.getHours(),n.length)},m(e,n){return l(e.getMinutes(),n.length)},s(e,n){return l(e.getSeconds(),n.length)},S(e,n){const t=n.length,a=e.getMilliseconds(),i=Math.trunc(a*Math.pow(10,t-3));return l(i,n.length)}},$={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},ie={G:function(e,n,t){const a=e.getFullYear()>0?1:0;switch(n){case"G":case"GG":case"GGG":return t.era(a,{width:"abbreviated"});case"GGGGG":return t.era(a,{width:"narrow"});case"GGGG":default:return t.era(a,{width:"wide"})}},y:function(e,n,t){if(n==="yo"){const a=e.getFullYear(),i=a>0?a:1-a;return t.ordinalNumber(i,{unit:"year"})}return _.y(e,n)},Y:function(e,n,t,a){const i=ge(e,a),o=i>0?i:1-i;if(n==="YY"){const c=o%100;return l(c,2)}return n==="Yo"?t.ordinalNumber(o,{unit:"year"}):l(o,n.length)},R:function(e,n){const t=he(e);return l(t,n.length)},u:function(e,n){const t=e.getFullYear();return l(t,n.length)},Q:function(e,n,t){const a=Math.ceil((e.getMonth()+1)/3);switch(n){case"Q":return String(a);case"QQ":return l(a,2);case"Qo":return t.ordinalNumber(a,{unit:"quarter"});case"QQQ":return t.quarter(a,{width:"abbreviated",context:"formatting"});case"QQQQQ":return t.quarter(a,{width:"narrow",context:"formatting"});case"QQQQ":default:return t.quarter(a,{width:"wide",context:"formatting"})}},q:function(e,n,t){const a=Math.ceil((e.getMonth()+1)/3);switch(n){case"q":return String(a);case"qq":return l(a,2);case"qo":return t.ordinalNumber(a,{unit:"quarter"});case"qqq":return t.quarter(a,{width:"abbreviated",context:"standalone"});case"qqqqq":return t.quarter(a,{width:"narrow",context:"standalone"});case"qqqq":default:return t.quarter(a,{width:"wide",context:"standalone"})}},M:function(e,n,t){const a=e.getMonth();switch(n){case"M":case"MM":return _.M(e,n);case"Mo":return t.ordinalNumber(a+1,{unit:"month"});case"MMM":return t.month(a,{width:"abbreviated",context:"formatting"});case"MMMMM":return t.month(a,{width:"narrow",context:"formatting"});case"MMMM":default:return t.month(a,{width:"wide",context:"formatting"})}},L:function(e,n,t){const a=e.getMonth();switch(n){case"L":return String(a+1);case"LL":return l(a+1,2);case"Lo":return t.ordinalNumber(a+1,{unit:"month"});case"LLL":return t.month(a,{width:"abbreviated",context:"standalone"});case"LLLLL":return t.month(a,{width:"narrow",context:"standalone"});case"LLLL":default:return t.month(a,{width:"wide",context:"standalone"})}},w:function(e,n,t,a){const i=vt(e,a);return n==="wo"?t.ordinalNumber(i,{unit:"week"}):l(i,n.length)},I:function(e,n,t){const a=wt(e);return n==="Io"?t.ordinalNumber(a,{unit:"week"}):l(a,n.length)},d:function(e,n,t){return n==="do"?t.ordinalNumber(e.getDate(),{unit:"date"}):_.d(e,n)},D:function(e,n,t){const a=xt(e);return n==="Do"?t.ordinalNumber(a,{unit:"dayOfYear"}):l(a,n.length)},E:function(e,n,t){const a=e.getDay();switch(n){case"E":case"EE":case"EEE":return t.day(a,{width:"abbreviated",context:"formatting"});case"EEEEE":return t.day(a,{width:"narrow",context:"formatting"});case"EEEEEE":return t.day(a,{width:"short",context:"formatting"});case"EEEE":default:return t.day(a,{width:"wide",context:"formatting"})}},e:function(e,n,t,a){const i=e.getDay(),o=(i-a.weekStartsOn+8)%7||7;switch(n){case"e":return String(o);case"ee":return l(o,2);case"eo":return t.ordinalNumber(o,{unit:"day"});case"eee":return t.day(i,{width:"abbreviated",context:"formatting"});case"eeeee":return t.day(i,{width:"narrow",context:"formatting"});case"eeeeee":return t.day(i,{width:"short",context:"formatting"});case"eeee":default:return t.day(i,{width:"wide",context:"formatting"})}},c:function(e,n,t,a){const i=e.getDay(),o=(i-a.weekStartsOn+8)%7||7;switch(n){case"c":return String(o);case"cc":return l(o,n.length);case"co":return t.ordinalNumber(o,{unit:"day"});case"ccc":return t.day(i,{width:"abbreviated",context:"standalone"});case"ccccc":return t.day(i,{width:"narrow",context:"standalone"});case"cccccc":return t.day(i,{width:"short",context:"standalone"});case"cccc":default:return t.day(i,{width:"wide",context:"standalone"})}},i:function(e,n,t){const a=e.getDay(),i=a===0?7:a;switch(n){case"i":return String(i);case"ii":return l(i,n.length);case"io":return t.ordinalNumber(i,{unit:"day"});case"iii":return t.day(a,{width:"abbreviated",context:"formatting"});case"iiiii":return t.day(a,{width:"narrow",context:"formatting"});case"iiiiii":return t.day(a,{width:"short",context:"formatting"});case"iiii":default:return t.day(a,{width:"wide",context:"formatting"})}},a:function(e,n,t){const i=e.getHours()/12>=1?"pm":"am";switch(n){case"a":case"aa":return t.dayPeriod(i,{width:"abbreviated",context:"formatting"});case"aaa":return t.dayPeriod(i,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return t.dayPeriod(i,{width:"narrow",context:"formatting"});case"aaaa":default:return t.dayPeriod(i,{width:"wide",context:"formatting"})}},b:function(e,n,t){const a=e.getHours();let i;switch(a===12?i=$.noon:a===0?i=$.midnight:i=a/12>=1?"pm":"am",n){case"b":case"bb":return t.dayPeriod(i,{width:"abbreviated",context:"formatting"});case"bbb":return t.dayPeriod(i,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return t.dayPeriod(i,{width:"narrow",context:"formatting"});case"bbbb":default:return t.dayPeriod(i,{width:"wide",context:"formatting"})}},B:function(e,n,t){const a=e.getHours();let i;switch(a>=17?i=$.evening:a>=12?i=$.afternoon:a>=4?i=$.morning:i=$.night,n){case"B":case"BB":case"BBB":return t.dayPeriod(i,{width:"abbreviated",context:"formatting"});case"BBBBB":return t.dayPeriod(i,{width:"narrow",context:"formatting"});case"BBBB":default:return t.dayPeriod(i,{width:"wide",context:"formatting"})}},h:function(e,n,t){if(n==="ho"){let a=e.getHours()%12;return a===0&&(a=12),t.ordinalNumber(a,{unit:"hour"})}return _.h(e,n)},H:function(e,n,t){return n==="Ho"?t.ordinalNumber(e.getHours(),{unit:"hour"}):_.H(e,n)},K:function(e,n,t){const a=e.getHours()%12;return n==="Ko"?t.ordinalNumber(a,{unit:"hour"}):l(a,n.length)},k:function(e,n,t){let a=e.getHours();return a===0&&(a=24),n==="ko"?t.ordinalNumber(a,{unit:"hour"}):l(a,n.length)},m:function(e,n,t){return n==="mo"?t.ordinalNumber(e.getMinutes(),{unit:"minute"}):_.m(e,n)},s:function(e,n,t){return n==="so"?t.ordinalNumber(e.getSeconds(),{unit:"second"}):_.s(e,n)},S:function(e,n){return _.S(e,n)},X:function(e,n,t){const a=e.getTimezoneOffset();if(a===0)return"Z";switch(n){case"X":return se(a);case"XXXX":case"XX":return T(a);case"XXXXX":case"XXX":default:return T(a,":")}},x:function(e,n,t){const a=e.getTimezoneOffset();switch(n){case"x":return se(a);case"xxxx":case"xx":return T(a);case"xxxxx":case"xxx":default:return T(a,":")}},O:function(e,n,t){const a=e.getTimezoneOffset();switch(n){case"O":case"OO":case"OOO":return"GMT"+oe(a,":");case"OOOO":default:return"GMT"+T(a,":")}},z:function(e,n,t){const a=e.getTimezoneOffset();switch(n){case"z":case"zz":case"zzz":return"GMT"+oe(a,":");case"zzzz":default:return"GMT"+T(a,":")}},t:function(e,n,t){const a=Math.trunc(+e/1e3);return l(a,n.length)},T:function(e,n,t){return l(+e,n.length)}};function oe(e,n=""){const t=e>0?"-":"+",a=Math.abs(e),i=Math.trunc(a/60),o=a%60;return o===0?t+String(i):t+String(i)+n+l(o,2)}function se(e,n){return e%60===0?(e>0?"-":"+")+l(Math.abs(e)/60,2):T(e,n)}function T(e,n=""){const t=e>0?"-":"+",a=Math.abs(e),i=l(Math.trunc(a/60),2),o=l(a%60,2);return t+i+n+o}const ce=(e,n)=>{switch(e){case"P":return n.date({width:"short"});case"PP":return n.date({width:"medium"});case"PPP":return n.date({width:"long"});case"PPPP":default:return n.date({width:"full"})}},be=(e,n)=>{switch(e){case"p":return n.time({width:"short"});case"pp":return n.time({width:"medium"});case"ppp":return n.time({width:"long"});case"pppp":default:return n.time({width:"full"})}},jt=(e,n)=>{const t=e.match(/(P+)(p+)?/)||[],a=t[1],i=t[2];if(!i)return ce(e,n);let o;switch(a){case"P":o=n.dateTime({width:"short"});break;case"PP":o=n.dateTime({width:"medium"});break;case"PPP":o=n.dateTime({width:"long"});break;case"PPPP":default:o=n.dateTime({width:"full"});break}return o.replace("{{date}}",ce(a,n)).replace("{{time}}",be(i,n))},Nt={p:be,P:jt},Mt=/^D+$/,Pt=/^Y+$/,kt=["D","DD","YY","YYYY"];function Dt(e){return Mt.test(e)}function Ot(e){return Pt.test(e)}function St(e,n,t){const a=_t(e,n,t);if(console.warn(a),kt.includes(e))throw new RangeError(a)}function _t(e,n,t){const a=e[0]==="Y"?"years":"days of the month";return`Use \`${e.toLowerCase()}\` instead of \`${e}\` (in \`${n}\`) for formatting ${a} to the input \`${t}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const Et=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Wt=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,Ct=/^'([^]*?)'?$/,Tt=/''/g,$t=/[a-zA-Z]/;function ee(e,n,t){var p,x,N,v,h,P,S,j;const a=V(),i=(t==null?void 0:t.locale)??a.locale??pt,o=(t==null?void 0:t.firstWeekContainsDate)??((x=(p=t==null?void 0:t.locale)==null?void 0:p.options)==null?void 0:x.firstWeekContainsDate)??a.firstWeekContainsDate??((v=(N=a.locale)==null?void 0:N.options)==null?void 0:v.firstWeekContainsDate)??1,c=(t==null?void 0:t.weekStartsOn)??((P=(h=t==null?void 0:t.locale)==null?void 0:h.options)==null?void 0:P.weekStartsOn)??a.weekStartsOn??((j=(S=a.locale)==null?void 0:S.options)==null?void 0:j.weekStartsOn)??0,d=M(e,t==null?void 0:t.in);if(!Ye(d))throw new RangeError("Invalid time value");let u=n.match(Wt).map(w=>{const s=w[0];if(s==="p"||s==="P"){const f=Nt[s];return f(w,i.formatLong)}return w}).join("").match(Et).map(w=>{if(w==="''")return{isToken:!1,value:"'"};const s=w[0];if(s==="'")return{isToken:!1,value:Rt(w)};if(ie[s])return{isToken:!0,value:w};if(s.match($t))throw new RangeError("Format string contains an unescaped latin alphabet character `"+s+"`");return{isToken:!1,value:w}});i.localize.preprocessor&&(u=i.localize.preprocessor(d,u));const m={firstWeekContainsDate:o,weekStartsOn:c,locale:i};return u.map(w=>{if(!w.isToken)return w.value;const s=w.value;(!(t!=null&&t.useAdditionalWeekYearTokens)&&Ot(s)||!(t!=null&&t.useAdditionalDayOfYearTokens)&&Dt(s))&&St(s,n,String(e));const f=ie[s[0]];return f(d,s,i.localize,m)}).join("")}function Rt(e){const n=e.match(Ct);return n?n[1].replace(Tt,"'"):e}const Ft={lessThanXSeconds:{one:"menos de un segundo",other:"menos de {{count}} segundos"},xSeconds:{one:"1 segundo",other:"{{count}} segundos"},halfAMinute:"medio minuto",lessThanXMinutes:{one:"menos de un minuto",other:"menos de {{count}} minutos"},xMinutes:{one:"1 minuto",other:"{{count}} minutos"},aboutXHours:{one:"alrededor de 1 hora",other:"alrededor de {{count}} horas"},xHours:{one:"1 hora",other:"{{count}} horas"},xDays:{one:"1 día",other:"{{count}} días"},aboutXWeeks:{one:"alrededor de 1 semana",other:"alrededor de {{count}} semanas"},xWeeks:{one:"1 semana",other:"{{count}} semanas"},aboutXMonths:{one:"alrededor de 1 mes",other:"alrededor de {{count}} meses"},xMonths:{one:"1 mes",other:"{{count}} meses"},aboutXYears:{one:"alrededor de 1 año",other:"alrededor de {{count}} años"},xYears:{one:"1 año",other:"{{count}} años"},overXYears:{one:"más de 1 año",other:"más de {{count}} años"},almostXYears:{one:"casi 1 año",other:"casi {{count}} años"}},Yt=(e,n,t)=>{let a;const i=Ft[e];return typeof i=="string"?a=i:n===1?a=i.one:a=i.other.replace("{{count}}",n.toString()),t!=null&&t.addSuffix?t.comparison&&t.comparison>0?"en "+a:"hace "+a:a},zt={full:"EEEE, d 'de' MMMM 'de' y",long:"d 'de' MMMM 'de' y",medium:"d MMM y",short:"dd/MM/y"},At={full:"HH:mm:ss zzzz",long:"HH:mm:ss z",medium:"HH:mm:ss",short:"HH:mm"},Lt={full:"{{date}} 'a las' {{time}}",long:"{{date}} 'a las' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},Ht={date:R({formats:zt,defaultWidth:"full"}),time:R({formats:At,defaultWidth:"full"}),dateTime:R({formats:Lt,defaultWidth:"full"})},qt={lastWeek:"'el' eeee 'pasado a la' p",yesterday:"'ayer a la' p",today:"'hoy a la' p",tomorrow:"'mañana a la' p",nextWeek:"eeee 'a la' p",other:"P"},It={lastWeek:"'el' eeee 'pasado a las' p",yesterday:"'ayer a las' p",today:"'hoy a las' p",tomorrow:"'mañana a las' p",nextWeek:"eeee 'a las' p",other:"P"},Xt=(e,n,t,a)=>n.getHours()!==1?It[e]:qt[e],Vt={narrow:["AC","DC"],abbreviated:["AC","DC"],wide:["antes de cristo","después de cristo"]},Qt={narrow:["1","2","3","4"],abbreviated:["T1","T2","T3","T4"],wide:["1º trimestre","2º trimestre","3º trimestre","4º trimestre"]},Bt={narrow:["e","f","m","a","m","j","j","a","s","o","n","d"],abbreviated:["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"],wide:["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]},Gt={narrow:["d","l","m","m","j","v","s"],short:["do","lu","ma","mi","ju","vi","sá"],abbreviated:["dom","lun","mar","mié","jue","vie","sáb"],wide:["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]},Jt={narrow:{am:"a",pm:"p",midnight:"mn",noon:"md",morning:"mañana",afternoon:"tarde",evening:"tarde",night:"noche"},abbreviated:{am:"AM",pm:"PM",midnight:"medianoche",noon:"mediodia",morning:"mañana",afternoon:"tarde",evening:"tarde",night:"noche"},wide:{am:"a.m.",pm:"p.m.",midnight:"medianoche",noon:"mediodia",morning:"mañana",afternoon:"tarde",evening:"tarde",night:"noche"}},Ut={narrow:{am:"a",pm:"p",midnight:"mn",noon:"md",morning:"de la mañana",afternoon:"de la tarde",evening:"de la tarde",night:"de la noche"},abbreviated:{am:"AM",pm:"PM",midnight:"medianoche",noon:"mediodia",morning:"de la mañana",afternoon:"de la tarde",evening:"de la tarde",night:"de la noche"},wide:{am:"a.m.",pm:"p.m.",midnight:"medianoche",noon:"mediodia",morning:"de la mañana",afternoon:"de la tarde",evening:"de la tarde",night:"de la noche"}},Kt=(e,n)=>Number(e)+"º",Zt={ordinalNumber:Kt,era:k({values:Vt,defaultWidth:"wide"}),quarter:k({values:Qt,defaultWidth:"wide",argumentCallback:e=>Number(e)-1}),month:k({values:Bt,defaultWidth:"wide"}),day:k({values:Gt,defaultWidth:"wide"}),dayPeriod:k({values:Jt,defaultWidth:"wide",formattingValues:Ut,defaultFormattingWidth:"wide"})},en=/^(\d+)(º)?/i,tn=/\d+/i,nn={narrow:/^(ac|dc|a|d)/i,abbreviated:/^(a\.?\s?c\.?|a\.?\s?e\.?\s?c\.?|d\.?\s?c\.?|e\.?\s?c\.?)/i,wide:/^(antes de cristo|antes de la era com[uú]n|despu[eé]s de cristo|era com[uú]n)/i},an={any:[/^ac/i,/^dc/i],wide:[/^(antes de cristo|antes de la era com[uú]n)/i,/^(despu[eé]s de cristo|era com[uú]n)/i]},rn={narrow:/^[1234]/i,abbreviated:/^T[1234]/i,wide:/^[1234](º)? trimestre/i},on={any:[/1/i,/2/i,/3/i,/4/i]},sn={narrow:/^[efmajsond]/i,abbreviated:/^(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i,wide:/^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i},cn={narrow:[/^e/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^en/i,/^feb/i,/^mar/i,/^abr/i,/^may/i,/^jun/i,/^jul/i,/^ago/i,/^sep/i,/^oct/i,/^nov/i,/^dic/i]},dn={narrow:/^[dlmjvs]/i,short:/^(do|lu|ma|mi|ju|vi|s[áa])/i,abbreviated:/^(dom|lun|mar|mi[ée]|jue|vie|s[áa]b)/i,wide:/^(domingo|lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado)/i},ln={narrow:[/^d/i,/^l/i,/^m/i,/^m/i,/^j/i,/^v/i,/^s/i],any:[/^do/i,/^lu/i,/^ma/i,/^mi/i,/^ju/i,/^vi/i,/^sa/i]},un={narrow:/^(a|p|mn|md|(de la|a las) (mañana|tarde|noche))/i,any:/^([ap]\.?\s?m\.?|medianoche|mediodia|(de la|a las) (mañana|tarde|noche))/i},mn={any:{am:/^a/i,pm:/^p/i,midnight:/^mn/i,noon:/^md/i,morning:/mañana/i,afternoon:/tarde/i,evening:/tarde/i,night:/noche/i}},hn={ordinalNumber:fe({matchPattern:en,parsePattern:tn,valueCallback:function(e){return parseInt(e,10)}}),era:D({matchPatterns:nn,defaultMatchWidth:"wide",parsePatterns:an,defaultParseWidth:"any"}),quarter:D({matchPatterns:rn,defaultMatchWidth:"wide",parsePatterns:on,defaultParseWidth:"any",valueCallback:e=>e+1}),month:D({matchPatterns:sn,defaultMatchWidth:"wide",parsePatterns:cn,defaultParseWidth:"any"}),day:D({matchPatterns:dn,defaultMatchWidth:"wide",parsePatterns:ln,defaultParseWidth:"any"}),dayPeriod:D({matchPatterns:un,defaultMatchWidth:"any",parsePatterns:mn,defaultParseWidth:"any"})},pe={code:"es",formatDistance:Yt,formatLong:Ht,formatRelative:Xt,localize:Zt,match:hn,options:{weekStartsOn:1,firstWeekContainsDate:1}},fn={creada:{label:"Por despachar",tone:"info"},despachada:{label:"En ruta",tone:"warning"},finalizada:{label:"Entregada",tone:"success"},devuelta:{label:"Devuelta",tone:"neutral"},anulada:{label:"Anulada",tone:"danger"}},gn=["creada","despachada"],bn=[{value:"efectivo",label:"Efectivo"},{value:"otro",label:"Otro"}],pn={transferencia:"Transferencia",datafono:"Datáfono",pagado:"Pagado"},xe=e=>{var n;return((n=bn.find(t=>t.value===e))==null?void 0:n.label)||pn[e]||e||""};function Tn(e){return e?e==="efectivo"?{metodo:"efectivo",otro:""}:{metodo:"otro",otro:e==="otro"?"":xe(e)}:{metodo:"",otro:""}}const $n=(e,n)=>e==="otro"?(n||"").trim():e||"",Rn=[{key:"manana",label:"Mañana",desde:"08:00",hasta:"12:00"},{key:"tarde",label:"Tarde",desde:"12:00",hasta:"18:00"},{key:"dia",label:"Todo el día",desde:"08:00",hasta:"18:00"}];function J(e){if(!e)return"";const[n,t]=e.split(":").map(Number);return`${n%12||12}:${String(t).padStart(2,"0")} ${n>=12?"p. m.":"a. m."}`}function xn(e,n){return!e&&!n?"":n?`${J(e)} – ${J(n)}`:`desde ${J(e)}`}const we=e=>e.charAt(0).toUpperCase()+e.slice(1);function Fn(e,n){const t=o=>{if(!o)return null;const[c,d]=o.split(":").map(Number);return{txt:`${c%12||12}${d?`:${String(d).padStart(2,"0")}`:""}`,suf:c>=12?"p. m.":"a. m."}},a=t(e),i=t(n);return!a&&!i?"":i?a?a.suf===i.suf?`${a.txt}–${i.txt} ${i.suf}`:`${a.txt} ${a.suf}–${i.txt} ${i.suf}`:`hasta ${i.txt} ${i.suf}`:`desde ${a.txt} ${a.suf}`}function wn(e,n=!1){const t=ue(e);return t?we(ee(t,n?"EEEE d 'de' MMMM 'de' yyyy":"EEEE d 'de' MMMM",{locale:pe})):""}function Yn(e){const n=ue(e);return n?we(ee(n,"EEE d MMM",{locale:pe}).replace(".","")):""}function zn(e,n){if(!e)return null;const t=Ee();if(e===t)return"hoy";const a=ee(new Date(Date.now()+864e5),"yyyy-MM-dd");return e===a?"manana":e<t&&gn.includes(n)?"atrasada":null}const A=e=>String(e??"").padStart(5,"0");function yn(e){var a;const n=((a=e==null?void 0:e.inventario_items_detalle)==null?void 0:a.length)||0,t=((e==null?void 0:e.items_manuales)||[]).reduce((i,o)=>i+(Number(o.cantidad)||1),0);return n+t}const vn=e=>[e.variacion,e.observacion].filter(Boolean).join(" — ");function jn(e){const n=new Map,t=[];((e==null?void 0:e.inventario_items_detalle)||[]).forEach(o=>{o.grupo_id?(n.has(o.grupo_id)||n.set(o.grupo_id,{nombre:o.grupo_nombre,observacion:o.grupo_observacion,items:[]}),n.get(o.grupo_id).items.push(o)):t.push(o)});const a=(o,c=!1)=>({tipo:"item",key:o.id_referencia,cantidad:1,categoria:o.categoria_nombre||"",subcategoria:o.subcategoria_nombre||"",referencia:o.producto_nombre||"",descripcion:o.descripcion_remision||vn(o),tela:o.tela_remision||"",codigo:o.id_referencia,anidado:c}),i=[];return n.forEach((o,c)=>{i.push({tipo:"grupo",key:`g-${c}`,nombre:o.nombre,observacion:o.observacion,piezas:o.items.length}),o.items.forEach(d=>i.push(a(d,!0)))}),t.forEach(o=>i.push(a(o))),((e==null?void 0:e.items_manuales)||[]).forEach(o=>i.push({tipo:"item",key:`m-${o.id}`,cantidad:o.cantidad,categoria:o.categoria_nombre||"",subcategoria:o.subcategoria_nombre||"",referencia:o.referencia||"",descripcion:o.descripcion||"",tela:o.tela||"",codigo:""})),i}const Nn=e=>(e==null?void 0:e.transportador_usuario_nombre)||(e==null?void 0:e.transportador)||"";function An(e){const n=String(e||"").replace(/\D/g,"");return n.length===10&&n.startsWith("3")?`57${n}`:n.length===12&&n.startsWith("573")?n:null}const Ln={faltante:"No iba en el viaje",rechazado:"El cliente no lo recibió",danado:"Llegó con daño",otro:"Otro"};function Hn(e){const n=((e==null?void 0:e.inventario_items_detalle)||[]).map(a=>({clave:`i-${a.id_referencia}`,tipo:"inventario",id:a.id_referencia,cantidad:1,nombre:`${a.producto_nombre||"Producto"} · ${a.id_referencia}`})),t=((e==null?void 0:e.items_manuales)||[]).map(a=>({clave:`m-${a.id}`,tipo:"item_manual",id:a.id,cantidad:a.cantidad||1,nombre:`${a.cantidad} × ${a.referencia||a.subcategoria_nombre||(a.descripcion||"").slice(0,40)||"Producto"}`}));return[...n,...t]}function qn(e,n){const t=String(e||"").trim().toLowerCase();if(!t)return null;const a=t.startsWith("item-")?t.slice(5):t;return((n==null?void 0:n.inventario_items_detalle)||[]).find(i=>i.qr_uuid&&i.qr_uuid.toLowerCase()===t||String(i.id_referencia).toLowerCase()===a)||null}const Mn=Ne.forwardRef(({remision:e},n)=>{var x,N,v;if(!e)return null;const t=e,a=jn(t),i=yn(t),o=(x=t.ventas)!=null&&x.length?t.ventas:t.orden_asociada?[t.orden_asociada]:[],c=[t.cliente_telefono1,t.cliente_telefono2].filter(Boolean).join(" / "),d=[t.barrio,t.ciudad].filter(Boolean).join(" · "),u=!t.sin_saldo&&Number(t.saldo)>0,m=t.estado==="anulada"||t.estado==="devuelta";let p=0;return r.jsxs("div",{ref:n,className:"rr-page",children:[m&&r.jsx("div",{className:"rr-watermark",children:fn[t.estado].label}),r.jsxs("div",{className:"rr-header",children:[r.jsxs("div",{children:[r.jsx("div",{className:"rr-logo",children:r.jsx("span",{children:"LOTTUS"})}),r.jsx("div",{className:"rr-company",children:"Bogotá D.C. · Tel. (601) 761-9348 · www.muebleslottus.com"})]}),r.jsxs("div",{className:"rr-doc-title",children:[r.jsx("div",{className:"rr-doc-kicker",children:"Remisión de entrega"}),r.jsxs("div",{className:"rr-doc-number",children:["No. ",A(t.id)]}),o.length>0&&r.jsxs("div",{className:"rr-doc-sub",children:[o.length>1?"Ventas":"Venta"," ",o.map(h=>`#${h}`).join(", ")]})]})]}),r.jsxs("div",{className:"rr-meta-grid",children:[r.jsxs("div",{className:"rr-meta-box",children:[r.jsx("div",{className:"rr-label",children:"Entregar a"}),r.jsx("div",{className:"rr-value rr-value--lg",children:t.cliente_nombre||"—"}),t.cliente_documento&&r.jsxs("div",{className:"rr-sub",children:["C.C. / NIT ",t.cliente_documento]}),c&&r.jsxs("div",{className:"rr-sub",children:["Tel. ",c]}),r.jsxs("div",{className:"rr-address",children:[t.direccion_entrega||"—",d&&r.jsx("span",{children:d})]})]}),r.jsxs("div",{className:"rr-meta-box",children:[r.jsx("div",{className:"rr-label",children:"Fecha de entrega"}),r.jsx("div",{className:"rr-value rr-value--lg",children:wn(t.fecha_entrega,!0)||"—"}),(t.hora_desde||t.hora_hasta)&&r.jsxs("div",{className:"rr-sub",children:["Franja: ",xn((N=t.hora_desde)==null?void 0:N.slice(0,5),(v=t.hora_hasta)==null?void 0:v.slice(0,5))]}),r.jsxs("div",{className:"rr-pairs",children:[r.jsxs("div",{children:[r.jsx("span",{className:"rr-label",children:"Transportador"}),r.jsx("span",{children:Nn(t)||"—"})]}),r.jsxs("div",{children:[r.jsx("span",{className:"rr-label",children:"Asesor"}),r.jsx("span",{children:t.vendedor_nombre||"—"})]})]})]})]}),t.observacion&&r.jsxs("div",{className:"rr-indicaciones",children:[r.jsx("span",{className:"rr-indicaciones-label",children:"Indicaciones:"})," ",t.observacion]}),r.jsxs("div",{className:"rr-section",children:[r.jsxs("div",{className:"rr-section-title",children:["Productos a entregar · ",i," unidad",i===1?"":"es"]}),r.jsxs("table",{className:"rr-table",children:[r.jsx("thead",{children:r.jsxs("tr",{children:[r.jsx("th",{className:"rr-col-num",children:"#"}),r.jsx("th",{className:"rr-col-cant",children:"Cant."}),r.jsx("th",{className:"rr-col-cat",children:"Categoría"}),r.jsx("th",{className:"rr-col-sub",children:"Subcategoría"}),r.jsx("th",{className:"rr-col-ref",children:"Referencia"}),r.jsx("th",{children:"Descripción"}),r.jsx("th",{className:"rr-col-check",children:"✓"})]})}),r.jsxs("tbody",{children:[a.length===0&&r.jsx("tr",{children:r.jsx("td",{colSpan:"7",className:"rr-empty",children:"Sin productos registrados."})}),a.map(h=>h.tipo==="grupo"?r.jsx("tr",{className:"rr-group-row",children:r.jsxs("td",{colSpan:"7",children:["Juego: ",h.nombre," · ",h.piezas," pieza",h.piezas===1?"":"s",h.observacion&&r.jsxs("span",{className:"rr-group-obs",children:[" — ",h.observacion]})]})},h.key):r.jsxs("tr",{children:[r.jsx("td",{className:"rr-col-num",children:++p}),r.jsx("td",{className:"rr-col-cant",children:h.cantidad}),r.jsx("td",{className:"rr-col-cat",children:h.categoria||"—"}),r.jsx("td",{className:"rr-col-sub",children:h.subcategoria||"—"}),r.jsxs("td",{className:"rr-col-ref",children:[r.jsx("div",{className:"rr-prod-name",children:h.referencia||"—"}),h.codigo&&r.jsx("div",{className:"rr-prod-code",children:h.codigo})]}),r.jsxs("td",{className:"rr-col-desc",children:[h.descripcion||(h.tela?"":"—"),h.tela&&r.jsxs("div",{className:"rr-tela",children:[r.jsx("strong",{children:"Tapizado:"})," ",h.tela]})]}),r.jsx("td",{className:"rr-col-check",children:r.jsx("span",{className:"rr-checkbox"})})]},h.key))]})]})]}),r.jsxs("div",{className:"rr-bottom",children:[r.jsxs("div",{className:"rr-novedades",children:[r.jsx("div",{className:"rr-label",children:"Novedades en la entrega"}),t.novedades&&r.jsx("div",{className:"rr-novedades-text",children:t.novedades}),r.jsxs("div",{className:"rr-lines",children:[r.jsx("span",{}),r.jsx("span",{}),!t.novedades&&r.jsx("span",{})]})]}),r.jsxs("div",{className:`rr-cobro${u?"":" rr-cobro--none"}`,children:[r.jsx("div",{className:"rr-cobro-head",children:u?"Cobrar contra entrega":"Cobro"}),r.jsx("div",{className:"rr-cobro-body",children:u?r.jsxs(r.Fragment,{children:[r.jsx("span",{className:"rr-cobro-value",children:_e(t.saldo)}),r.jsx("span",{className:"rr-cobro-sub",children:xe(t.metodo_pago)||"Método por confirmar"})]}):r.jsx("span",{className:"rr-cobro-value rr-cobro-value--sm",children:"Sin saldo pendiente"})})]})]}),r.jsxs("div",{className:"rr-firmas",children:[r.jsxs("div",{className:"rr-firma",children:[r.jsx("div",{className:"rr-firma-title",children:"Despachado por"}),r.jsx("div",{className:"rr-firma-line",children:"Nombre"}),r.jsx("div",{className:"rr-firma-line",children:"Firma"})]}),r.jsxs("div",{className:"rr-firma",children:[r.jsx("div",{className:"rr-firma-title",children:"Recibí a satisfacción"}),r.jsx("div",{className:"rr-firma-line",children:"Nombre y C.C."}),r.jsx("div",{className:"rr-firma-line",children:"Firma"}),r.jsx("div",{className:"rr-firma-line",children:"Fecha y hora"})]})]}),r.jsx("p",{className:"rr-legal",children:"Al firmar este documento, el receptor confirma haber recibido los productos relacionados en perfectas condiciones y a entera satisfacción, de conformidad con las especificaciones acordadas."}),r.jsxs("div",{className:"rr-footer",children:["LOTTUS · Remisión No. ",A(t.id)," · Impreso el"," ",new Date().toLocaleDateString("es-CO",{year:"numeric",month:"long",day:"numeric"})]})]})}),Pn=`/* Remisión de entrega — plantilla imprimible.
   Misma línea gráfica que el Comprobante de Egreso (negro/blanco corporativo).
   Este CSS vive solo dentro del iframe de RemisionPrintModal, que sirve a la vez
   de vista previa y de documento a imprimir: debe ser autosuficiente (sin
   variables del design system). Los márgenes de la hoja los pone @page / body. */

.rr-page {
  position: relative;
  width: 100%;
  background: #ffffff;
  color: #0f172a;
  font-family: "Segoe UI", Arial, sans-serif;
  box-sizing: border-box;
  overflow: hidden;
}

.rr-page * {
  box-sizing: border-box;
}

.rr-watermark {
  position: absolute;
  top: 38%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-24deg);
  font-size: 5.5rem;
  font-weight: 900;
  letter-spacing: 0.5rem;
  text-transform: uppercase;
  color: rgba(220, 38, 38, 0.13);
  border: 8px solid rgba(220, 38, 38, 0.13);
  padding: 0.25rem 1.5rem;
  pointer-events: none;
  white-space: nowrap;
}

/* ── Encabezado ── */
.rr-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  border-bottom: 2px solid #0f172a;
  padding-bottom: 0.9rem;
  margin-bottom: 1.1rem;
}

.rr-logo {
  background: #000000;
  padding: 0.6rem 1.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.rr-logo span {
  color: #ffffff;
  font-size: 1.35rem;
  letter-spacing: 0.25rem;
  font-family: "Audiowide", cursive, sans-serif;
  line-height: 1;
}

.rr-company {
  margin-top: 0.45rem;
  font-size: 0.62rem;
  line-height: 1.5;
  color: #475569;
}

.rr-doc-title {
  text-align: right;
}

.rr-doc-kicker {
  font-size: 0.62rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.12rem;
  margin-bottom: 0.15rem;
}

.rr-doc-number {
  font-size: 1.4rem;
  font-weight: 900;
  letter-spacing: 0.02rem;
  font-variant-numeric: tabular-nums;
}

.rr-doc-sub {
  font-size: 0.72rem;
  font-weight: 700;
  color: #334155;
  margin-top: 0.1rem;
}

/* ── Datos ── */
.rr-meta-grid {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  border: 1px solid #cbd5e1;
  margin-bottom: 0.9rem;
}

.rr-meta-box {
  padding: 0.8rem 1rem;
}

.rr-meta-box:first-child {
  border-right: 1px solid #cbd5e1;
}

.rr-label {
  display: block;
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.06rem;
  margin-bottom: 0.2rem;
}

.rr-value {
  font-size: 0.85rem;
  font-weight: 700;
}

.rr-value--lg {
  font-size: 0.98rem;
  font-weight: 800;
}

.rr-sub {
  font-size: 0.72rem;
  color: #334155;
  font-weight: 600;
  margin-top: 0.15rem;
}

.rr-address {
  margin-top: 0.55rem;
  padding-top: 0.5rem;
  border-top: 1px dashed #cbd5e1;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.4;
}

.rr-address span {
  display: block;
  font-weight: 600;
  color: #475569;
  font-size: 0.72rem;
}

.rr-pairs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-top: 0.55rem;
  padding-top: 0.5rem;
  border-top: 1px dashed #cbd5e1;
  font-size: 0.78rem;
  font-weight: 700;
}

.rr-pairs .rr-label {
  margin-bottom: 0.1rem;
}

.rr-indicaciones {
  font-size: 0.76rem;
  color: #334155;
  margin-bottom: 0.9rem;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border-left: 3px solid #0f172a;
  line-height: 1.45;
}

.rr-indicaciones-label {
  font-weight: 800;
  color: #0f172a;
}

/* ── Productos ── */
.rr-section {
  margin-bottom: 0.9rem;
}

.rr-section-title {
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06rem;
  color: #475569;
  margin-bottom: 0.35rem;
}

.rr-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.76rem;
  border: 1px solid #cbd5e1;
}

.rr-table thead tr {
  background: #0f172a;
}

.rr-table th {
  padding: 0.45rem 0.6rem;
  text-align: left;
  font-weight: 700;
  font-size: 0.6rem;
  letter-spacing: 0.05rem;
  text-transform: uppercase;
  color: #ffffff;
}

.rr-table td {
  padding: 0.45rem 0.6rem;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: top;
}

.rr-table tbody tr {
  page-break-inside: avoid;
  break-inside: avoid;
}

.rr-col-num {
  width: 30px;
  color: #64748b;
  text-align: center;
}

.rr-table th.rr-col-num,
.rr-table th.rr-col-check {
  text-align: center;
}

.rr-col-cant {
  width: 48px;
  text-align: center;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.rr-col-cat {
  width: 80px;
}

.rr-col-sub {
  width: 100px;
}

.rr-col-ref {
  width: 118px;
}

.rr-col-cat,
.rr-col-sub,
.rr-col-desc {
  color: #334155;
}

.rr-col-desc {
  white-space: pre-wrap;
  line-height: 1.4;
}

.rr-col-check {
  width: 34px;
  text-align: center;
}

.rr-checkbox {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 1.5px solid #64748b;
  border-radius: 2px;
  margin-top: 0.1rem;
}

.rr-prod-name {
  font-weight: 700;
}

.rr-prod-code {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 0.64rem;
  color: #64748b;
  margin-top: 0.1rem;
}

.rr-group-row td {
  background: #f1f5f9;
  font-size: 0.66rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04rem;
  color: #0f172a;
  padding: 0.35rem 0.6rem;
}

.rr-group-obs {
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
  color: #475569;
}

.rr-empty {
  text-align: center;
  color: #94a3b8;
  font-style: italic;
  padding: 1rem !important;
}

/* ── Novedades + cobro ── */
.rr-bottom {
  display: grid;
  grid-template-columns: 1fr 250px;
  gap: 0.9rem;
  margin-bottom: 0.9rem;
  page-break-inside: avoid;
  break-inside: avoid;
}

.rr-novedades {
  border: 1px solid #cbd5e1;
  padding: 0.6rem 0.8rem;
}

.rr-novedades-text {
  font-size: 0.76rem;
  font-weight: 600;
  line-height: 1.45;
  color: #0f172a;
  white-space: pre-wrap;
  margin-top: 0.1rem;
}

.rr-lines span {
  display: block;
  height: 1.35rem;
  border-bottom: 1px solid #cbd5e1;
}

.rr-cobro {
  border: 1px solid #cbd5e1;
  border-top: 3px solid #0f172a;
  display: flex;
  flex-direction: column;
}

.rr-cobro-head {
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06rem;
  color: #475569;
  padding: 0.55rem 0.8rem 0;
}

.rr-cobro-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0.35rem 0.8rem 0.65rem;
}

.rr-cobro:not(.rr-cobro--none) .rr-cobro-body {
  background: #0f172a;
  color: #ffffff;
  margin-top: 0.45rem;
  padding-top: 0.6rem;
}

.rr-cobro-value {
  font-size: 1.2rem;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.rr-cobro-value--sm {
  font-size: 0.85rem;
  font-weight: 800;
  color: #334155;
}

.rr-cobro-sub {
  font-size: 0.7rem;
  font-weight: 700;
  opacity: 0.85;
  margin-top: 0.1rem;
}

/* ── Firmas ── */
.rr-firmas {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.9rem;
  page-break-inside: avoid;
  break-inside: avoid;
}

.rr-firma {
  border: 1px solid #cbd5e1;
  padding: 0.65rem 0.9rem 0.7rem;
}

.rr-firma-title {
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05rem;
  color: #475569;
}

.rr-firma-line {
  margin-top: 1.55rem;
  border-top: 1.25px solid #0f172a;
  padding-top: 0.2rem;
  font-size: 0.6rem;
  color: #64748b;
  font-weight: 600;
}

.rr-legal {
  margin: 0.75rem 0 0;
  font-size: 0.64rem;
  font-style: italic;
  color: #475569;
  line-height: 1.45;
}

.rr-footer {
  margin-top: 0.9rem;
  padding-top: 0.45rem;
  border-top: 1px solid #e2e8f0;
  text-align: center;
  font-size: 0.56rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05rem;
}

/* Tapizado del producto (material, referencia y color). */
.rr-tela { margin-top: 2px; }
.rr-tela strong { font-weight: 700; }
`,z=816,I=1056,K=11,Z=K*96/25.4,de=I-2*Z;function kn(e,n){return`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${e}</title>
<link href="https://fonts.googleapis.com/css2?family=Audiowide&display=swap" rel="stylesheet">
<style>
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  @page { size: letter portrait; margin: ${K}mm; }
  @media screen {
    html, body { overflow: hidden; }
    body { padding: ${K}mm; }
  }
  ${Pn}
</style>
</head>
<body>${n}</body>
</html>`}const In=({open:e,onClose:n,remision:t,closeLabel:a="Cerrar"})=>{const i=b.useRef(null),o=b.useRef(null),c=b.useRef(null),[d,u]=b.useState(""),[m,p]=b.useState(!1),[x,N]=b.useState(I),[v,h]=b.useState(null),[P,S]=b.useState("hoja"),[j,w]=b.useState(!1);b.useLayoutEffect(()=>{if(!e||!i.current){u(""),p(!1);return}const g=`Remision ${t?A(t.id):""}`,y=kn(g,i.current.outerHTML);y!==d&&(u(y),p(!1))},[e,t]),b.useEffect(()=>{const g=c.current;if(!e||!g)return;const y=new ResizeObserver(([W])=>{const{width:C,height:Q}=W.contentRect;h({w:C,h:Q})});return y.observe(g),()=>y.disconnect()},[e]);const s=b.useCallback(()=>{var y,W;const g=(y=o.current)==null?void 0:y.contentDocument;(W=g==null?void 0:g.body)!=null&&W.querySelector(".rr-page")&&Promise.race([g.fonts?g.fonts.ready:Promise.resolve(),new Promise(C=>setTimeout(C,900))]).then(()=>{N(Math.max(I,Math.ceil(g.body.getBoundingClientRect().height))),p(!0)})},[]),f=()=>{var y;const g=(y=o.current)==null?void 0:y.contentWindow;!g||!m||(g.focus(),g.print())},E=async()=>{var y,W;const g=(y=o.current)==null?void 0:y.contentDocument;if(!(!(g!=null&&g.body)||!m||j)){w(!0);try{const{default:C}=await ke(async()=>{const{default:H}=await import("./html2canvas.esm-QH1iLAAe.js");return{default:H}},[],import.meta.url);await((W=document.fonts)==null?void 0:W.load('22px "Audiowide"').catch(()=>{}));const Q=await C(g.body,{backgroundColor:"var(--surface)",scale:2,useCORS:!0,logging:!1,width:z,height:g.body.scrollHeight,windowWidth:z,onclone:H=>{const te=H.createElement("style");te.textContent="html, body, .rr-page { overflow: visible !important; } .rr-logo { display: inline-block !important; line-height: 1; }",H.head.appendChild(te)}}),B=document.createElement("a");B.href=Q.toDataURL("image/png"),B.download=`remision_${A(t==null?void 0:t.id)}.png`,B.click()}catch(C){console.error("Error al generar la imagen de la remisión:",C)}finally{w(!1)}}},F=Math.max(1,Math.ceil((x-2*Z-1)/de)),ve=v?Math.min(v.w/z,v.h/I,1):0,Y=P==="real"?1:ve,je=m&&Y>0;return r.jsxs(Se,{open:e,onClose:n,title:t?`Remisión No. ${A(t.id)}`:"Remisión",size:"xl",className:"rpm-modal",footer:r.jsxs(r.Fragment,{children:[r.jsxs("div",{className:"rpm-info",children:[r.jsxs("div",{className:"rpm-zoom",role:"group","aria-label":"Tamaño de la vista previa",children:[r.jsx("button",{type:"button",className:P==="hoja"?"is-active":"",onClick:()=>S("hoja"),children:"Hoja completa"}),r.jsx("button",{type:"button",className:P==="real"?"is-active":"",onClick:()=>S("real"),children:"100 %"})]}),r.jsxs("span",{className:"rpm-paper",children:["Carta · ",F," hoja",F===1?"":"s"]})]}),r.jsx(G,{variant:"secondary",onClick:n,children:a}),r.jsx(G,{variant:"secondary",icon:Me,onClick:E,disabled:!m,loading:j,children:"Descargar PNG"}),r.jsx(G,{variant:"primary",icon:Pe,onClick:f,disabled:!m,children:"Imprimir"})]}),children:[r.jsx("div",{className:"rpm-visor",ref:c,children:r.jsxs("div",{className:`rpm-hoja${je?"":" is-cargando"}${P==="hoja"?" is-reducida":""}`,style:{width:z*Y,height:x*Y},onClick:()=>S(g=>g==="hoja"?"real":"hoja"),title:P==="hoja"?"Clic para ver al 100 %":"Clic para ver la hoja completa",children:[d&&r.jsx("iframe",{ref:o,className:"rpm-frame",title:"Vista previa de impresión",srcDoc:d,onLoad:s,tabIndex:-1,style:{width:z,height:x,transform:`scale(${Y||1})`}}),Array.from({length:F-1},(g,y)=>r.jsx("div",{className:"rpm-corte",style:{top:(Z+(y+1)*de)*Y},children:r.jsxs("span",{children:["Hoja ",y+2]})},y))]})}),r.jsx("div",{className:"rpm-plantilla","aria-hidden":"true",children:r.jsx(Mn,{ref:i,remision:t})})]})},U={categorias:[],referencias:[]};let q=null;function Xn(){const[e,n]=b.useState(U);return b.useEffect(()=>{let t=!0;return q||(q=De.get("/suministros/remisiones/catalogo/").then(a=>a.data||U).catch(()=>(q=null,U))),q.then(a=>{t&&n(a)}),()=>{t=!1}},[]),e}const ye="rp-referencias";function Vn({catalogo:e}){return r.jsx("datalist",{id:ye,children:e.referencias.map(n=>r.jsx("option",{value:n.nombre},n.nombre))})}const Qn=(e={})=>({categoria:null,subcategoria:null,referencia:"",descripcion:"",tela:"",cantidad:1,...e}),Bn=e=>!e.categoria&&!e.subcategoria&&!e.referencia.trim()&&!e.descripcion.trim(),Gn=e=>!e.subcategoria&&!e.referencia.trim()&&!e.descripcion.trim(),Jn=e=>({categoria:e.categoria||null,subcategoria:e.subcategoria||null,referencia:e.referencia.trim(),descripcion:e.descripcion.trim(),tela:(e.tela||"").trim(),cantidad:Math.max(1,parseInt(e.cantidad,10)||1)});function Dn({value:e,onChange:n,disabled:t}){const[a,i]=b.useState(!!(e||"").trim()),o=b.useRef(null);b.useEffect(()=>{(e||"").trim()&&i(!0)},[e]);const c=()=>{if(a){i(!1),n("");return}i(!0),setTimeout(()=>{var d;return(d=o.current)==null?void 0:d.focus()},0)};return r.jsxs("div",{className:`rp-tela${a?" is-on":""}`,children:[r.jsxs("button",{type:"button",role:"switch","aria-checked":a,className:"rp-tela__switch",onClick:c,disabled:t,children:[r.jsx("span",{className:"rp-tela__pista","aria-hidden":"true"}),r.jsx("span",{children:a?"Lleva tela o cuero":"¿Lleva tela o cuero?"})]}),a&&r.jsx("input",{ref:o,className:"nr-input",maxLength:200,value:e||"",placeholder:"Material, referencia y color · ej.: Tela Lino · color arena",onChange:d=>n(d.target.value),disabled:t,"aria-label":"Tapizado (tela o cuero)"})]})}function Un({value:e,original:n,onChange:t}){const a=b.useRef(null),i=e??n;return b.useLayoutEffect(()=>{const o=a.current;o&&(o.style.height="auto",o.style.height=`${o.scrollHeight+2}px`)},[i]),r.jsxs("div",{className:"rp-inv",children:[r.jsx("textarea",{ref:a,className:"nr-input rp-inv__desc",rows:1,value:i,placeholder:n||"Descripción para el cliente: color, tela, medidas, acabados…",onChange:o=>t(o.target.value),"aria-label":"Descripción en la remisión"}),e!=null&&e!==n&&n&&r.jsxs("button",{type:"button",className:"nr-link rp-restore",onClick:()=>t(void 0),children:[r.jsx(le,{})," Usar el texto del inventario"]})]})}function Kn({item:e,catalogo:n,onChange:t,incluido:a=!0,onToggle:i,onRemove:o,original:c,aviso:d,extra:u,error:m,autoFocus:p}){const x=b.useRef(null),N=b.useMemo(()=>{const s={};return n.categorias.forEach(f=>f.subcategorias.forEach(E=>{s[E.id]=f.id})),s},[n]),v=n.categorias.find(s=>s.id===e.categoria);b.useLayoutEffect(()=>{const s=x.current;s&&(s.style.height="auto",s.style.height=`${s.scrollHeight+2}px`)},[e.descripcion]);const h=s=>{const f=s?Number(s):null;t({categoria:f,subcategoria:f&&N[e.subcategoria]===f?e.subcategoria:null})},P=s=>{const f=s?Number(s):null;t({subcategoria:f,categoria:f?N[f]??e.categoria:e.categoria})},S=s=>{const f={referencia:s},E=n.referencias.find(F=>F.nombre.toLowerCase()===s.trim().toLowerCase());E&&!e.categoria&&!e.subcategoria&&(f.categoria=E.categoria,f.subcategoria=E.subcategoria),t(f)},j=!a,w=c!=null&&e.descripcion!==c;return r.jsxs("div",{className:`rp-item${j?" is-off":""}${m?" has-error":""}`,children:[i&&r.jsx("input",{type:"checkbox",className:"nr-check rp-item__check",checked:a,onChange:i,"aria-label":"Incluir en la remisión"}),r.jsxs("div",{className:"rp-item__main",children:[r.jsxs("div",{className:"rp-item__fields",children:[r.jsxs("select",{className:"nr-input rp-cat",value:e.categoria??"",onChange:s=>h(s.target.value),disabled:j,"aria-label":"Categoría",children:[r.jsx("option",{value:"",children:"Categoría"}),n.categorias.map(s=>r.jsx("option",{value:s.id,children:s.nombre},s.id))]}),r.jsxs("select",{className:"nr-input rp-sub",value:e.subcategoria??"",onChange:s=>P(s.target.value),disabled:j,"aria-label":"Subcategoría",children:[r.jsx("option",{value:"",children:"Subcategoría"}),v?v.subcategorias.map(s=>r.jsx("option",{value:s.id,children:s.nombre},s.id)):n.categorias.map(s=>r.jsx("optgroup",{label:s.nombre,children:s.subcategorias.map(f=>r.jsx("option",{value:f.id,children:f.nombre},f.id))},s.id))]}),r.jsx("input",{className:"nr-input rp-ref",list:ye,placeholder:"Referencia",value:e.referencia,onChange:s=>S(s.target.value),disabled:j,autoFocus:p,"aria-label":"Referencia"}),r.jsxs("label",{className:"rp-cant",children:[r.jsx("span",{children:"Cant."}),r.jsx("input",{type:"number",min:"1",inputMode:"numeric",className:"nr-input",value:e.cantidad,onChange:s=>t({cantidad:s.target.value===""?"":Math.max(1,parseInt(s.target.value,10)||1)}),disabled:j})]}),r.jsx("textarea",{ref:x,className:"nr-input rp-desc",rows:1,placeholder:"Descripción para el cliente: color, tela, medidas, acabados…",value:e.descripcion,onChange:s=>t({descripcion:s.target.value}),disabled:j,"aria-label":"Descripción"}),r.jsx(Dn,{value:e.tela,onChange:s=>t({tela:s}),disabled:j})]}),(d||u||w||m)&&!j&&r.jsxs("div",{className:"rp-item__foot",children:[m&&r.jsx("span",{className:"rp-error",children:m}),d,u,w&&r.jsxs("button",{type:"button",className:"nr-link rp-restore",onClick:()=>t({descripcion:c}),children:[r.jsx(le,{})," Usar el texto del pedido"]})]})]}),o&&r.jsx("button",{type:"button",className:"nr-icon-btn rp-item__remove",onClick:o,title:"Quitar","aria-label":"Quitar producto",children:r.jsx(Oe,{})})]})}export{zn as A,fn as B,xn as C,An as D,gn as E,Rn as F,vn as G,Un as H,Ln as M,Kn as P,Vn as R,Dn as T,Cn as a,A as b,Xn as c,wn as d,pe as e,ee as f,J as g,bn as h,$n as i,Qn as j,Bn as k,jn as l,Tn as m,Te as n,Jn as o,Hn as p,Gn as q,Nn as r,re as s,yn as t,qn as u,Yn as v,Fn as w,xe as x,In as y,L as z};
