import{R as Me,j as o,r as p,B as te,p as Ne,_ as Pe,s as ke,a3 as le,by as De}from"./index-DdrxNfoj.js";import{M as Oe}from"./Modal-CwScgEZ6.js";import{B as Se}from"./BotonImprimir-wgtueoCs.js";import{f as _e}from"./formatCOP-yhuxI7nV.js";import{p as ue,g as Ee}from"./dates-CiDIK8D2.js";/* empty css                           */const me=6048e5,We=864e5,ne=Symbol.for("constructDateFrom");function D(e,n){return typeof e=="function"?e(n):e&&typeof e=="object"&&ne in e?e[ne](n):e instanceof Date?new e.constructor(n):new Date(n)}function M(e,n){return D(n||e,e)}function Tn(e,n,t){const a=M(e,t==null?void 0:t.in);return isNaN(n)?D(e,NaN):(n&&a.setDate(a.getDate()+n),a)}let Ce={};function V(){return Ce}function L(e,n){var d,m,f,b;const t=V(),a=(n==null?void 0:n.weekStartsOn)??((m=(d=n==null?void 0:n.locale)==null?void 0:d.options)==null?void 0:m.weekStartsOn)??t.weekStartsOn??((b=(f=t.locale)==null?void 0:f.options)==null?void 0:b.weekStartsOn)??0,r=M(e,n==null?void 0:n.in),i=r.getDay(),c=(i<a?7:0)+i-a;return r.setDate(r.getDate()-c),r.setHours(0,0,0,0),r}function X(e,n){return L(e,{...n,weekStartsOn:1})}function fe(e,n){const t=M(e,n==null?void 0:n.in),a=t.getFullYear(),r=D(t,0);r.setFullYear(a+1,0,4),r.setHours(0,0,0,0);const i=X(r),c=D(t,0);c.setFullYear(a,0,4),c.setHours(0,0,0,0);const d=X(c);return t.getTime()>=i.getTime()?a+1:t.getTime()>=d.getTime()?a:a-1}function ae(e){const n=M(e),t=new Date(Date.UTC(n.getFullYear(),n.getMonth(),n.getDate(),n.getHours(),n.getMinutes(),n.getSeconds(),n.getMilliseconds()));return t.setUTCFullYear(n.getFullYear()),+e-+t}function Te(e,...n){const t=D.bind(null,n.find(a=>typeof a=="object"));return n.map(t)}function re(e,n){const t=M(e,n==null?void 0:n.in);return t.setHours(0,0,0,0),t}function $e(e,n,t){const[a,r]=Te(t==null?void 0:t.in,e,n),i=re(a),c=re(r),d=+i-ae(i),m=+c-ae(c);return Math.round((d-m)/We)}function Re(e,n){const t=fe(e,n),a=D(e,0);return a.setFullYear(t,0,4),a.setHours(0,0,0,0),X(a)}function Ye(e){return e instanceof Date||typeof e=="object"&&Object.prototype.toString.call(e)==="[object Date]"}function Fe(e){return!(!Ye(e)&&typeof e!="number"||isNaN(+M(e)))}function ze(e,n){const t=M(e,n==null?void 0:n.in);return t.setFullYear(t.getFullYear(),0,1),t.setHours(0,0,0,0),t}const Ae={lessThanXSeconds:{one:"less than a second",other:"less than {{count}} seconds"},xSeconds:{one:"1 second",other:"{{count}} seconds"},halfAMinute:"half a minute",lessThanXMinutes:{one:"less than a minute",other:"less than {{count}} minutes"},xMinutes:{one:"1 minute",other:"{{count}} minutes"},aboutXHours:{one:"about 1 hour",other:"about {{count}} hours"},xHours:{one:"1 hour",other:"{{count}} hours"},xDays:{one:"1 day",other:"{{count}} days"},aboutXWeeks:{one:"about 1 week",other:"about {{count}} weeks"},xWeeks:{one:"1 week",other:"{{count}} weeks"},aboutXMonths:{one:"about 1 month",other:"about {{count}} months"},xMonths:{one:"1 month",other:"{{count}} months"},aboutXYears:{one:"about 1 year",other:"about {{count}} years"},xYears:{one:"1 year",other:"{{count}} years"},overXYears:{one:"over 1 year",other:"over {{count}} years"},almostXYears:{one:"almost 1 year",other:"almost {{count}} years"}},Le=(e,n,t)=>{let a;const r=Ae[e];return typeof r=="string"?a=r:n===1?a=r.one:a=r.other.replace("{{count}}",n.toString()),t!=null&&t.addSuffix?t.comparison&&t.comparison>0?"in "+a:a+" ago":a};function Y(e){return(n={})=>{const t=n.width?String(n.width):e.defaultWidth;return e.formats[t]||e.formats[e.defaultWidth]}}const He={full:"EEEE, MMMM do, y",long:"MMMM do, y",medium:"MMM d, y",short:"MM/dd/yyyy"},qe={full:"h:mm:ss a zzzz",long:"h:mm:ss a z",medium:"h:mm:ss a",short:"h:mm a"},Ie={full:"{{date}} 'at' {{time}}",long:"{{date}} 'at' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},Xe={date:Y({formats:He,defaultWidth:"full"}),time:Y({formats:qe,defaultWidth:"full"}),dateTime:Y({formats:Ie,defaultWidth:"full"})},Ve={lastWeek:"'last' eeee 'at' p",yesterday:"'yesterday at' p",today:"'today at' p",tomorrow:"'tomorrow at' p",nextWeek:"eeee 'at' p",other:"P"},Be=(e,n,t,a)=>Ve[e];function P(e){return(n,t)=>{const a=t!=null&&t.context?String(t.context):"standalone";let r;if(a==="formatting"&&e.formattingValues){const c=e.defaultFormattingWidth||e.defaultWidth,d=t!=null&&t.width?String(t.width):c;r=e.formattingValues[d]||e.formattingValues[c]}else{const c=e.defaultWidth,d=t!=null&&t.width?String(t.width):e.defaultWidth;r=e.values[d]||e.values[c]}const i=e.argumentCallback?e.argumentCallback(n):n;return r[i]}}const Qe={narrow:["B","A"],abbreviated:["BC","AD"],wide:["Before Christ","Anno Domini"]},Ge={narrow:["1","2","3","4"],abbreviated:["Q1","Q2","Q3","Q4"],wide:["1st quarter","2nd quarter","3rd quarter","4th quarter"]},Je={narrow:["J","F","M","A","M","J","J","A","S","O","N","D"],abbreviated:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],wide:["January","February","March","April","May","June","July","August","September","October","November","December"]},Ue={narrow:["S","M","T","W","T","F","S"],short:["Su","Mo","Tu","We","Th","Fr","Sa"],abbreviated:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],wide:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]},Ke={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"}},Ze={narrow:{am:"a",pm:"p",midnight:"mi",noon:"n",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},abbreviated:{am:"AM",pm:"PM",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"},wide:{am:"a.m.",pm:"p.m.",midnight:"midnight",noon:"noon",morning:"in the morning",afternoon:"in the afternoon",evening:"in the evening",night:"at night"}},et=(e,n)=>{const t=Number(e),a=t%100;if(a>20||a<10)switch(a%10){case 1:return t+"st";case 2:return t+"nd";case 3:return t+"rd"}return t+"th"},tt={ordinalNumber:et,era:P({values:Qe,defaultWidth:"wide"}),quarter:P({values:Ge,defaultWidth:"wide",argumentCallback:e=>e-1}),month:P({values:Je,defaultWidth:"wide"}),day:P({values:Ue,defaultWidth:"wide"}),dayPeriod:P({values:Ke,defaultWidth:"wide",formattingValues:Ze,defaultFormattingWidth:"wide"})};function k(e){return(n,t={})=>{const a=t.width,r=a&&e.matchPatterns[a]||e.matchPatterns[e.defaultMatchWidth],i=n.match(r);if(!i)return null;const c=i[0],d=a&&e.parsePatterns[a]||e.parsePatterns[e.defaultParseWidth],m=Array.isArray(d)?at(d,w=>w.test(c)):nt(d,w=>w.test(c));let f;f=e.valueCallback?e.valueCallback(m):m,f=t.valueCallback?t.valueCallback(f):f;const b=n.slice(c.length);return{value:f,rest:b}}}function nt(e,n){for(const t in e)if(Object.prototype.hasOwnProperty.call(e,t)&&n(e[t]))return t}function at(e,n){for(let t=0;t<e.length;t++)if(n(e[t]))return t}function he(e){return(n,t={})=>{const a=n.match(e.matchPattern);if(!a)return null;const r=a[0],i=n.match(e.parsePattern);if(!i)return null;let c=e.valueCallback?e.valueCallback(i[0]):i[0];c=t.valueCallback?t.valueCallback(c):c;const d=n.slice(r.length);return{value:c,rest:d}}}const rt=/^(\d+)(th|st|nd|rd)?/i,ot=/\d+/i,it={narrow:/^(b|a)/i,abbreviated:/^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,wide:/^(before christ|before common era|anno domini|common era)/i},st={any:[/^b/i,/^(a|c)/i]},ct={narrow:/^[1234]/i,abbreviated:/^q[1234]/i,wide:/^[1234](th|st|nd|rd)? quarter/i},dt={any:[/1/i,/2/i,/3/i,/4/i]},lt={narrow:/^[jfmasond]/i,abbreviated:/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,wide:/^(january|february|march|april|may|june|july|august|september|october|november|december)/i},ut={narrow:[/^j/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^ja/i,/^f/i,/^mar/i,/^ap/i,/^may/i,/^jun/i,/^jul/i,/^au/i,/^s/i,/^o/i,/^n/i,/^d/i]},mt={narrow:/^[smtwf]/i,short:/^(su|mo|tu|we|th|fr|sa)/i,abbreviated:/^(sun|mon|tue|wed|thu|fri|sat)/i,wide:/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i},ft={narrow:[/^s/i,/^m/i,/^t/i,/^w/i,/^t/i,/^f/i,/^s/i],any:[/^su/i,/^m/i,/^tu/i,/^w/i,/^th/i,/^f/i,/^sa/i]},ht={narrow:/^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,any:/^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i},gt={any:{am:/^a/i,pm:/^p/i,midnight:/^mi/i,noon:/^no/i,morning:/morning/i,afternoon:/afternoon/i,evening:/evening/i,night:/night/i}},bt={ordinalNumber:he({matchPattern:rt,parsePattern:ot,valueCallback:e=>parseInt(e,10)}),era:k({matchPatterns:it,defaultMatchWidth:"wide",parsePatterns:st,defaultParseWidth:"any"}),quarter:k({matchPatterns:ct,defaultMatchWidth:"wide",parsePatterns:dt,defaultParseWidth:"any",valueCallback:e=>e+1}),month:k({matchPatterns:lt,defaultMatchWidth:"wide",parsePatterns:ut,defaultParseWidth:"any"}),day:k({matchPatterns:mt,defaultMatchWidth:"wide",parsePatterns:ft,defaultParseWidth:"any"}),dayPeriod:k({matchPatterns:ht,defaultMatchWidth:"any",parsePatterns:gt,defaultParseWidth:"any"})},pt={code:"en-US",formatDistance:Le,formatLong:Xe,formatRelative:Be,localize:tt,match:bt,options:{weekStartsOn:0,firstWeekContainsDate:1}};function wt(e,n){const t=M(e,n==null?void 0:n.in);return $e(t,ze(t))+1}function yt(e,n){const t=M(e,n==null?void 0:n.in),a=+X(t)-+Re(t);return Math.round(a/me)+1}function ge(e,n){var b,w,j,l;const t=M(e,n==null?void 0:n.in),a=t.getFullYear(),r=V(),i=(n==null?void 0:n.firstWeekContainsDate)??((w=(b=n==null?void 0:n.locale)==null?void 0:b.options)==null?void 0:w.firstWeekContainsDate)??r.firstWeekContainsDate??((l=(j=r.locale)==null?void 0:j.options)==null?void 0:l.firstWeekContainsDate)??1,c=D((n==null?void 0:n.in)||e,0);c.setFullYear(a+1,0,i),c.setHours(0,0,0,0);const d=L(c,n),m=D((n==null?void 0:n.in)||e,0);m.setFullYear(a,0,i),m.setHours(0,0,0,0);const f=L(m,n);return+t>=+d?a+1:+t>=+f?a:a-1}function xt(e,n){var d,m,f,b;const t=V(),a=(n==null?void 0:n.firstWeekContainsDate)??((m=(d=n==null?void 0:n.locale)==null?void 0:d.options)==null?void 0:m.firstWeekContainsDate)??t.firstWeekContainsDate??((b=(f=t.locale)==null?void 0:f.options)==null?void 0:b.firstWeekContainsDate)??1,r=ge(e,n),i=D((n==null?void 0:n.in)||e,0);return i.setFullYear(r,0,a),i.setHours(0,0,0,0),L(i,n)}function vt(e,n){const t=M(e,n==null?void 0:n.in),a=+L(t,n)-+xt(t,n);return Math.round(a/me)+1}function u(e,n){const t=e<0?"-":"",a=Math.abs(e).toString().padStart(n,"0");return t+a}const S={y(e,n){const t=e.getFullYear(),a=t>0?t:1-t;return u(n==="yy"?a%100:a,n.length)},M(e,n){const t=e.getMonth();return n==="M"?String(t+1):u(t+1,2)},d(e,n){return u(e.getDate(),n.length)},a(e,n){const t=e.getHours()/12>=1?"pm":"am";switch(n){case"a":case"aa":return t.toUpperCase();case"aaa":return t;case"aaaaa":return t[0];case"aaaa":default:return t==="am"?"a.m.":"p.m."}},h(e,n){return u(e.getHours()%12||12,n.length)},H(e,n){return u(e.getHours(),n.length)},m(e,n){return u(e.getMinutes(),n.length)},s(e,n){return u(e.getSeconds(),n.length)},S(e,n){const t=n.length,a=e.getMilliseconds(),r=Math.trunc(a*Math.pow(10,t-3));return u(r,n.length)}},$={midnight:"midnight",noon:"noon",morning:"morning",afternoon:"afternoon",evening:"evening",night:"night"},oe={G:function(e,n,t){const a=e.getFullYear()>0?1:0;switch(n){case"G":case"GG":case"GGG":return t.era(a,{width:"abbreviated"});case"GGGGG":return t.era(a,{width:"narrow"});case"GGGG":default:return t.era(a,{width:"wide"})}},y:function(e,n,t){if(n==="yo"){const a=e.getFullYear(),r=a>0?a:1-a;return t.ordinalNumber(r,{unit:"year"})}return S.y(e,n)},Y:function(e,n,t,a){const r=ge(e,a),i=r>0?r:1-r;if(n==="YY"){const c=i%100;return u(c,2)}return n==="Yo"?t.ordinalNumber(i,{unit:"year"}):u(i,n.length)},R:function(e,n){const t=fe(e);return u(t,n.length)},u:function(e,n){const t=e.getFullYear();return u(t,n.length)},Q:function(e,n,t){const a=Math.ceil((e.getMonth()+1)/3);switch(n){case"Q":return String(a);case"QQ":return u(a,2);case"Qo":return t.ordinalNumber(a,{unit:"quarter"});case"QQQ":return t.quarter(a,{width:"abbreviated",context:"formatting"});case"QQQQQ":return t.quarter(a,{width:"narrow",context:"formatting"});case"QQQQ":default:return t.quarter(a,{width:"wide",context:"formatting"})}},q:function(e,n,t){const a=Math.ceil((e.getMonth()+1)/3);switch(n){case"q":return String(a);case"qq":return u(a,2);case"qo":return t.ordinalNumber(a,{unit:"quarter"});case"qqq":return t.quarter(a,{width:"abbreviated",context:"standalone"});case"qqqqq":return t.quarter(a,{width:"narrow",context:"standalone"});case"qqqq":default:return t.quarter(a,{width:"wide",context:"standalone"})}},M:function(e,n,t){const a=e.getMonth();switch(n){case"M":case"MM":return S.M(e,n);case"Mo":return t.ordinalNumber(a+1,{unit:"month"});case"MMM":return t.month(a,{width:"abbreviated",context:"formatting"});case"MMMMM":return t.month(a,{width:"narrow",context:"formatting"});case"MMMM":default:return t.month(a,{width:"wide",context:"formatting"})}},L:function(e,n,t){const a=e.getMonth();switch(n){case"L":return String(a+1);case"LL":return u(a+1,2);case"Lo":return t.ordinalNumber(a+1,{unit:"month"});case"LLL":return t.month(a,{width:"abbreviated",context:"standalone"});case"LLLLL":return t.month(a,{width:"narrow",context:"standalone"});case"LLLL":default:return t.month(a,{width:"wide",context:"standalone"})}},w:function(e,n,t,a){const r=vt(e,a);return n==="wo"?t.ordinalNumber(r,{unit:"week"}):u(r,n.length)},I:function(e,n,t){const a=yt(e);return n==="Io"?t.ordinalNumber(a,{unit:"week"}):u(a,n.length)},d:function(e,n,t){return n==="do"?t.ordinalNumber(e.getDate(),{unit:"date"}):S.d(e,n)},D:function(e,n,t){const a=wt(e);return n==="Do"?t.ordinalNumber(a,{unit:"dayOfYear"}):u(a,n.length)},E:function(e,n,t){const a=e.getDay();switch(n){case"E":case"EE":case"EEE":return t.day(a,{width:"abbreviated",context:"formatting"});case"EEEEE":return t.day(a,{width:"narrow",context:"formatting"});case"EEEEEE":return t.day(a,{width:"short",context:"formatting"});case"EEEE":default:return t.day(a,{width:"wide",context:"formatting"})}},e:function(e,n,t,a){const r=e.getDay(),i=(r-a.weekStartsOn+8)%7||7;switch(n){case"e":return String(i);case"ee":return u(i,2);case"eo":return t.ordinalNumber(i,{unit:"day"});case"eee":return t.day(r,{width:"abbreviated",context:"formatting"});case"eeeee":return t.day(r,{width:"narrow",context:"formatting"});case"eeeeee":return t.day(r,{width:"short",context:"formatting"});case"eeee":default:return t.day(r,{width:"wide",context:"formatting"})}},c:function(e,n,t,a){const r=e.getDay(),i=(r-a.weekStartsOn+8)%7||7;switch(n){case"c":return String(i);case"cc":return u(i,n.length);case"co":return t.ordinalNumber(i,{unit:"day"});case"ccc":return t.day(r,{width:"abbreviated",context:"standalone"});case"ccccc":return t.day(r,{width:"narrow",context:"standalone"});case"cccccc":return t.day(r,{width:"short",context:"standalone"});case"cccc":default:return t.day(r,{width:"wide",context:"standalone"})}},i:function(e,n,t){const a=e.getDay(),r=a===0?7:a;switch(n){case"i":return String(r);case"ii":return u(r,n.length);case"io":return t.ordinalNumber(r,{unit:"day"});case"iii":return t.day(a,{width:"abbreviated",context:"formatting"});case"iiiii":return t.day(a,{width:"narrow",context:"formatting"});case"iiiiii":return t.day(a,{width:"short",context:"formatting"});case"iiii":default:return t.day(a,{width:"wide",context:"formatting"})}},a:function(e,n,t){const r=e.getHours()/12>=1?"pm":"am";switch(n){case"a":case"aa":return t.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"aaa":return t.dayPeriod(r,{width:"abbreviated",context:"formatting"}).toLowerCase();case"aaaaa":return t.dayPeriod(r,{width:"narrow",context:"formatting"});case"aaaa":default:return t.dayPeriod(r,{width:"wide",context:"formatting"})}},b:function(e,n,t){const a=e.getHours();let r;switch(a===12?r=$.noon:a===0?r=$.midnight:r=a/12>=1?"pm":"am",n){case"b":case"bb":return t.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"bbb":return t.dayPeriod(r,{width:"abbreviated",context:"formatting"}).toLowerCase();case"bbbbb":return t.dayPeriod(r,{width:"narrow",context:"formatting"});case"bbbb":default:return t.dayPeriod(r,{width:"wide",context:"formatting"})}},B:function(e,n,t){const a=e.getHours();let r;switch(a>=17?r=$.evening:a>=12?r=$.afternoon:a>=4?r=$.morning:r=$.night,n){case"B":case"BB":case"BBB":return t.dayPeriod(r,{width:"abbreviated",context:"formatting"});case"BBBBB":return t.dayPeriod(r,{width:"narrow",context:"formatting"});case"BBBB":default:return t.dayPeriod(r,{width:"wide",context:"formatting"})}},h:function(e,n,t){if(n==="ho"){let a=e.getHours()%12;return a===0&&(a=12),t.ordinalNumber(a,{unit:"hour"})}return S.h(e,n)},H:function(e,n,t){return n==="Ho"?t.ordinalNumber(e.getHours(),{unit:"hour"}):S.H(e,n)},K:function(e,n,t){const a=e.getHours()%12;return n==="Ko"?t.ordinalNumber(a,{unit:"hour"}):u(a,n.length)},k:function(e,n,t){let a=e.getHours();return a===0&&(a=24),n==="ko"?t.ordinalNumber(a,{unit:"hour"}):u(a,n.length)},m:function(e,n,t){return n==="mo"?t.ordinalNumber(e.getMinutes(),{unit:"minute"}):S.m(e,n)},s:function(e,n,t){return n==="so"?t.ordinalNumber(e.getSeconds(),{unit:"second"}):S.s(e,n)},S:function(e,n){return S.S(e,n)},X:function(e,n,t){const a=e.getTimezoneOffset();if(a===0)return"Z";switch(n){case"X":return se(a);case"XXXX":case"XX":return C(a);case"XXXXX":case"XXX":default:return C(a,":")}},x:function(e,n,t){const a=e.getTimezoneOffset();switch(n){case"x":return se(a);case"xxxx":case"xx":return C(a);case"xxxxx":case"xxx":default:return C(a,":")}},O:function(e,n,t){const a=e.getTimezoneOffset();switch(n){case"O":case"OO":case"OOO":return"GMT"+ie(a,":");case"OOOO":default:return"GMT"+C(a,":")}},z:function(e,n,t){const a=e.getTimezoneOffset();switch(n){case"z":case"zz":case"zzz":return"GMT"+ie(a,":");case"zzzz":default:return"GMT"+C(a,":")}},t:function(e,n,t){const a=Math.trunc(+e/1e3);return u(a,n.length)},T:function(e,n,t){return u(+e,n.length)}};function ie(e,n=""){const t=e>0?"-":"+",a=Math.abs(e),r=Math.trunc(a/60),i=a%60;return i===0?t+String(r):t+String(r)+n+u(i,2)}function se(e,n){return e%60===0?(e>0?"-":"+")+u(Math.abs(e)/60,2):C(e,n)}function C(e,n=""){const t=e>0?"-":"+",a=Math.abs(e),r=u(Math.trunc(a/60),2),i=u(a%60,2);return t+r+n+i}const ce=(e,n)=>{switch(e){case"P":return n.date({width:"short"});case"PP":return n.date({width:"medium"});case"PPP":return n.date({width:"long"});case"PPPP":default:return n.date({width:"full"})}},be=(e,n)=>{switch(e){case"p":return n.time({width:"short"});case"pp":return n.time({width:"medium"});case"ppp":return n.time({width:"long"});case"pppp":default:return n.time({width:"full"})}},jt=(e,n)=>{const t=e.match(/(P+)(p+)?/)||[],a=t[1],r=t[2];if(!r)return ce(e,n);let i;switch(a){case"P":i=n.dateTime({width:"short"});break;case"PP":i=n.dateTime({width:"medium"});break;case"PPP":i=n.dateTime({width:"long"});break;case"PPPP":default:i=n.dateTime({width:"full"});break}return i.replace("{{date}}",ce(a,n)).replace("{{time}}",be(r,n))},Mt={p:be,P:jt},Nt=/^D+$/,Pt=/^Y+$/,kt=["D","DD","YY","YYYY"];function Dt(e){return Nt.test(e)}function Ot(e){return Pt.test(e)}function St(e,n,t){const a=_t(e,n,t);if(console.warn(a),kt.includes(e))throw new RangeError(a)}function _t(e,n,t){const a=e[0]==="Y"?"years":"days of the month";return`Use \`${e.toLowerCase()}\` instead of \`${e}\` (in \`${n}\`) for formatting ${a} to the input \`${t}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`}const Et=/[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g,Wt=/P+p+|P+|p+|''|'(''|[^'])+('|$)|./g,Ct=/^'([^]*?)'?$/,Tt=/''/g,$t=/[a-zA-Z]/;function Z(e,n,t){var b,w,j,l,T,N,O,v;const a=V(),r=(t==null?void 0:t.locale)??a.locale??pt,i=(t==null?void 0:t.firstWeekContainsDate)??((w=(b=t==null?void 0:t.locale)==null?void 0:b.options)==null?void 0:w.firstWeekContainsDate)??a.firstWeekContainsDate??((l=(j=a.locale)==null?void 0:j.options)==null?void 0:l.firstWeekContainsDate)??1,c=(t==null?void 0:t.weekStartsOn)??((N=(T=t==null?void 0:t.locale)==null?void 0:T.options)==null?void 0:N.weekStartsOn)??a.weekStartsOn??((v=(O=a.locale)==null?void 0:O.options)==null?void 0:v.weekStartsOn)??0,d=M(e,t==null?void 0:t.in);if(!Fe(d))throw new RangeError("Invalid time value");let m=n.match(Wt).map(y=>{const s=y[0];if(s==="p"||s==="P"){const h=Mt[s];return h(y,r.formatLong)}return y}).join("").match(Et).map(y=>{if(y==="''")return{isToken:!1,value:"'"};const s=y[0];if(s==="'")return{isToken:!1,value:Rt(y)};if(oe[s])return{isToken:!0,value:y};if(s.match($t))throw new RangeError("Format string contains an unescaped latin alphabet character `"+s+"`");return{isToken:!1,value:y}});r.localize.preprocessor&&(m=r.localize.preprocessor(d,m));const f={firstWeekContainsDate:i,weekStartsOn:c,locale:r};return m.map(y=>{if(!y.isToken)return y.value;const s=y.value;(!(t!=null&&t.useAdditionalWeekYearTokens)&&Ot(s)||!(t!=null&&t.useAdditionalDayOfYearTokens)&&Dt(s))&&St(s,n,String(e));const h=oe[s[0]];return h(d,s,r.localize,f)}).join("")}function Rt(e){const n=e.match(Ct);return n?n[1].replace(Tt,"'"):e}const Yt={lessThanXSeconds:{one:"menos de un segundo",other:"menos de {{count}} segundos"},xSeconds:{one:"1 segundo",other:"{{count}} segundos"},halfAMinute:"medio minuto",lessThanXMinutes:{one:"menos de un minuto",other:"menos de {{count}} minutos"},xMinutes:{one:"1 minuto",other:"{{count}} minutos"},aboutXHours:{one:"alrededor de 1 hora",other:"alrededor de {{count}} horas"},xHours:{one:"1 hora",other:"{{count}} horas"},xDays:{one:"1 día",other:"{{count}} días"},aboutXWeeks:{one:"alrededor de 1 semana",other:"alrededor de {{count}} semanas"},xWeeks:{one:"1 semana",other:"{{count}} semanas"},aboutXMonths:{one:"alrededor de 1 mes",other:"alrededor de {{count}} meses"},xMonths:{one:"1 mes",other:"{{count}} meses"},aboutXYears:{one:"alrededor de 1 año",other:"alrededor de {{count}} años"},xYears:{one:"1 año",other:"{{count}} años"},overXYears:{one:"más de 1 año",other:"más de {{count}} años"},almostXYears:{one:"casi 1 año",other:"casi {{count}} años"}},Ft=(e,n,t)=>{let a;const r=Yt[e];return typeof r=="string"?a=r:n===1?a=r.one:a=r.other.replace("{{count}}",n.toString()),t!=null&&t.addSuffix?t.comparison&&t.comparison>0?"en "+a:"hace "+a:a},zt={full:"EEEE, d 'de' MMMM 'de' y",long:"d 'de' MMMM 'de' y",medium:"d MMM y",short:"dd/MM/y"},At={full:"HH:mm:ss zzzz",long:"HH:mm:ss z",medium:"HH:mm:ss",short:"HH:mm"},Lt={full:"{{date}} 'a las' {{time}}",long:"{{date}} 'a las' {{time}}",medium:"{{date}}, {{time}}",short:"{{date}}, {{time}}"},Ht={date:Y({formats:zt,defaultWidth:"full"}),time:Y({formats:At,defaultWidth:"full"}),dateTime:Y({formats:Lt,defaultWidth:"full"})},qt={lastWeek:"'el' eeee 'pasado a la' p",yesterday:"'ayer a la' p",today:"'hoy a la' p",tomorrow:"'mañana a la' p",nextWeek:"eeee 'a la' p",other:"P"},It={lastWeek:"'el' eeee 'pasado a las' p",yesterday:"'ayer a las' p",today:"'hoy a las' p",tomorrow:"'mañana a las' p",nextWeek:"eeee 'a las' p",other:"P"},Xt=(e,n,t,a)=>n.getHours()!==1?It[e]:qt[e],Vt={narrow:["AC","DC"],abbreviated:["AC","DC"],wide:["antes de cristo","después de cristo"]},Bt={narrow:["1","2","3","4"],abbreviated:["T1","T2","T3","T4"],wide:["1º trimestre","2º trimestre","3º trimestre","4º trimestre"]},Qt={narrow:["e","f","m","a","m","j","j","a","s","o","n","d"],abbreviated:["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"],wide:["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"]},Gt={narrow:["d","l","m","m","j","v","s"],short:["do","lu","ma","mi","ju","vi","sá"],abbreviated:["dom","lun","mar","mié","jue","vie","sáb"],wide:["domingo","lunes","martes","miércoles","jueves","viernes","sábado"]},Jt={narrow:{am:"a",pm:"p",midnight:"mn",noon:"md",morning:"mañana",afternoon:"tarde",evening:"tarde",night:"noche"},abbreviated:{am:"AM",pm:"PM",midnight:"medianoche",noon:"mediodia",morning:"mañana",afternoon:"tarde",evening:"tarde",night:"noche"},wide:{am:"a.m.",pm:"p.m.",midnight:"medianoche",noon:"mediodia",morning:"mañana",afternoon:"tarde",evening:"tarde",night:"noche"}},Ut={narrow:{am:"a",pm:"p",midnight:"mn",noon:"md",morning:"de la mañana",afternoon:"de la tarde",evening:"de la tarde",night:"de la noche"},abbreviated:{am:"AM",pm:"PM",midnight:"medianoche",noon:"mediodia",morning:"de la mañana",afternoon:"de la tarde",evening:"de la tarde",night:"de la noche"},wide:{am:"a.m.",pm:"p.m.",midnight:"medianoche",noon:"mediodia",morning:"de la mañana",afternoon:"de la tarde",evening:"de la tarde",night:"de la noche"}},Kt=(e,n)=>Number(e)+"º",Zt={ordinalNumber:Kt,era:P({values:Vt,defaultWidth:"wide"}),quarter:P({values:Bt,defaultWidth:"wide",argumentCallback:e=>Number(e)-1}),month:P({values:Qt,defaultWidth:"wide"}),day:P({values:Gt,defaultWidth:"wide"}),dayPeriod:P({values:Jt,defaultWidth:"wide",formattingValues:Ut,defaultFormattingWidth:"wide"})},en=/^(\d+)(º)?/i,tn=/\d+/i,nn={narrow:/^(ac|dc|a|d)/i,abbreviated:/^(a\.?\s?c\.?|a\.?\s?e\.?\s?c\.?|d\.?\s?c\.?|e\.?\s?c\.?)/i,wide:/^(antes de cristo|antes de la era com[uú]n|despu[eé]s de cristo|era com[uú]n)/i},an={any:[/^ac/i,/^dc/i],wide:[/^(antes de cristo|antes de la era com[uú]n)/i,/^(despu[eé]s de cristo|era com[uú]n)/i]},rn={narrow:/^[1234]/i,abbreviated:/^T[1234]/i,wide:/^[1234](º)? trimestre/i},on={any:[/1/i,/2/i,/3/i,/4/i]},sn={narrow:/^[efmajsond]/i,abbreviated:/^(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i,wide:/^(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i},cn={narrow:[/^e/i,/^f/i,/^m/i,/^a/i,/^m/i,/^j/i,/^j/i,/^a/i,/^s/i,/^o/i,/^n/i,/^d/i],any:[/^en/i,/^feb/i,/^mar/i,/^abr/i,/^may/i,/^jun/i,/^jul/i,/^ago/i,/^sep/i,/^oct/i,/^nov/i,/^dic/i]},dn={narrow:/^[dlmjvs]/i,short:/^(do|lu|ma|mi|ju|vi|s[áa])/i,abbreviated:/^(dom|lun|mar|mi[ée]|jue|vie|s[áa]b)/i,wide:/^(domingo|lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado)/i},ln={narrow:[/^d/i,/^l/i,/^m/i,/^m/i,/^j/i,/^v/i,/^s/i],any:[/^do/i,/^lu/i,/^ma/i,/^mi/i,/^ju/i,/^vi/i,/^sa/i]},un={narrow:/^(a|p|mn|md|(de la|a las) (mañana|tarde|noche))/i,any:/^([ap]\.?\s?m\.?|medianoche|mediodia|(de la|a las) (mañana|tarde|noche))/i},mn={any:{am:/^a/i,pm:/^p/i,midnight:/^mn/i,noon:/^md/i,morning:/mañana/i,afternoon:/tarde/i,evening:/tarde/i,night:/noche/i}},fn={ordinalNumber:he({matchPattern:en,parsePattern:tn,valueCallback:function(e){return parseInt(e,10)}}),era:k({matchPatterns:nn,defaultMatchWidth:"wide",parsePatterns:an,defaultParseWidth:"any"}),quarter:k({matchPatterns:rn,defaultMatchWidth:"wide",parsePatterns:on,defaultParseWidth:"any",valueCallback:e=>e+1}),month:k({matchPatterns:sn,defaultMatchWidth:"wide",parsePatterns:cn,defaultParseWidth:"any"}),day:k({matchPatterns:dn,defaultMatchWidth:"wide",parsePatterns:ln,defaultParseWidth:"any"}),dayPeriod:k({matchPatterns:un,defaultMatchWidth:"any",parsePatterns:mn,defaultParseWidth:"any"})},pe={code:"es",formatDistance:Ft,formatLong:Ht,formatRelative:Xt,localize:Zt,match:fn,options:{weekStartsOn:1,firstWeekContainsDate:1}},hn={creada:{label:"Por despachar",tone:"info"},despachada:{label:"En ruta",tone:"warning"},finalizada:{label:"Entregada",tone:"success"},devuelta:{label:"Devuelta",tone:"neutral"},anulada:{label:"Anulada",tone:"danger"}},gn=["creada","despachada"],bn=[{value:"efectivo",label:"Efectivo"},{value:"otro",label:"Otro"}],pn={transferencia:"Transferencia",datafono:"Datáfono",pagado:"Pagado"},we=e=>{var n;return((n=bn.find(t=>t.value===e))==null?void 0:n.label)||pn[e]||e||""};function $n(e){return e?e==="efectivo"?{metodo:"efectivo",otro:""}:{metodo:"otro",otro:e==="otro"?"":we(e)}:{metodo:"",otro:""}}const Rn=(e,n)=>e==="otro"?(n||"").trim():e||"",Yn=[{key:"manana",label:"Mañana",desde:"08:00",hasta:"12:00"},{key:"tarde",label:"Tarde",desde:"12:00",hasta:"18:00"},{key:"dia",label:"Todo el día",desde:"08:00",hasta:"18:00"}];function G(e){if(!e)return"";const[n,t]=e.split(":").map(Number);return`${n%12||12}:${String(t).padStart(2,"0")} ${n>=12?"p. m.":"a. m."}`}function wn(e,n){return!e&&!n?"":n?`${G(e)} – ${G(n)}`:`desde ${G(e)}`}const ye=e=>e.charAt(0).toUpperCase()+e.slice(1);function Fn(e,n){const t=i=>{if(!i)return null;const[c,d]=i.split(":").map(Number);return{txt:`${c%12||12}${d?`:${String(d).padStart(2,"0")}`:""}`,suf:c>=12?"p. m.":"a. m."}},a=t(e),r=t(n);return!a&&!r?"":r?a?a.suf===r.suf?`${a.txt}–${r.txt} ${r.suf}`:`${a.txt} ${a.suf}–${r.txt} ${r.suf}`:`hasta ${r.txt} ${r.suf}`:`desde ${a.txt} ${a.suf}`}function yn(e,n=!1){const t=ue(e);return t?ye(Z(t,n?"EEEE d 'de' MMMM 'de' yyyy":"EEEE d 'de' MMMM",{locale:pe})):""}function zn(e){const n=ue(e);return n?ye(Z(n,"EEE d MMM",{locale:pe}).replace(".","")):""}function An(e,n){if(!e)return null;const t=Ee();if(e===t)return"hoy";const a=Z(new Date(Date.now()+864e5),"yyyy-MM-dd");return e===a?"manana":e<t&&gn.includes(n)?"atrasada":null}const R=e=>String(e??"").padStart(5,"0");function xn(e){var a;const n=((a=e==null?void 0:e.inventario_items_detalle)==null?void 0:a.length)||0,t=((e==null?void 0:e.items_manuales)||[]).reduce((r,i)=>r+(Number(i.cantidad)||1),0);return n+t}const vn=e=>[e.variacion,e.observacion].filter(Boolean).join(" — ");function jn(e){const n=new Map,t=[];((e==null?void 0:e.inventario_items_detalle)||[]).forEach(i=>{i.grupo_id?(n.has(i.grupo_id)||n.set(i.grupo_id,{nombre:i.grupo_nombre,observacion:i.grupo_observacion,items:[]}),n.get(i.grupo_id).items.push(i)):t.push(i)});const a=(i,c=!1)=>({tipo:"item",key:i.id_referencia,cantidad:1,categoria:i.categoria_nombre||"",subcategoria:i.subcategoria_nombre||"",referencia:i.producto_nombre||"",descripcion:i.descripcion_remision||vn(i),tela:i.tela_remision||"",codigo:i.id_referencia,anidado:c}),r=[];return n.forEach((i,c)=>{r.push({tipo:"grupo",key:`g-${c}`,nombre:i.nombre,observacion:i.observacion,piezas:i.items.length}),i.items.forEach(d=>r.push(a(d,!0)))}),t.forEach(i=>r.push(a(i))),((e==null?void 0:e.items_manuales)||[]).forEach(i=>r.push({tipo:"item",key:`m-${i.id}`,cantidad:i.cantidad,categoria:i.categoria_nombre||"",subcategoria:i.subcategoria_nombre||"",referencia:i.referencia||"",descripcion:i.descripcion||"",tela:i.tela||"",codigo:""})),r}const Mn=e=>(e==null?void 0:e.transportador_usuario_nombre)||(e==null?void 0:e.transportador)||"";function Ln(e){const n=String(e||"").replace(/\D/g,"");return n.length===10&&n.startsWith("3")?`57${n}`:n.length===12&&n.startsWith("573")?n:null}const Hn={faltante:"No iba en el viaje",rechazado:"El cliente no lo recibió",danado:"Llegó con daño",otro:"Otro"};function qn(e){const n=((e==null?void 0:e.inventario_items_detalle)||[]).map(a=>({clave:`i-${a.id_referencia}`,tipo:"inventario",id:a.id_referencia,cantidad:1,nombre:`${a.producto_nombre||"Producto"} · ${a.id_referencia}`})),t=((e==null?void 0:e.items_manuales)||[]).map(a=>({clave:`m-${a.id}`,tipo:"item_manual",id:a.id,cantidad:a.cantidad||1,nombre:`${a.cantidad} × ${a.referencia||a.subcategoria_nombre||(a.descripcion||"").slice(0,40)||"Producto"}`}));return[...n,...t]}function In(e,n){const t=String(e||"").trim().toLowerCase();if(!t)return null;const a=t.startsWith("item-")?t.slice(5):t;return((n==null?void 0:n.inventario_items_detalle)||[]).find(r=>r.qr_uuid&&r.qr_uuid.toLowerCase()===t||String(r.id_referencia).toLowerCase()===a)||null}const Nn=Me.forwardRef(({remision:e},n)=>{var b,w,j;if(!e)return null;const t=e,a=jn(t),r=xn(t),i=(b=t.ventas)!=null&&b.length?t.ventas:t.orden_asociada?[t.orden_asociada]:[],c=[t.cliente_telefono1,t.cliente_telefono2].filter(Boolean).join(" / "),d=[t.barrio,t.ciudad].filter(Boolean).join(" · "),m=!t.sin_saldo&&Number(t.saldo)>0,f=t.estado==="anulada"||t.estado==="devuelta";return o.jsxs("div",{ref:n,className:"rr-page",children:[f&&o.jsx("div",{className:"rr-watermark",children:hn[t.estado].label}),o.jsxs("div",{className:"rr-header",children:[o.jsxs("div",{children:[o.jsx("div",{className:"rr-logo",children:o.jsx("span",{children:"LOTTUS"})}),o.jsx("div",{className:"rr-company",children:"Bogotá D.C. · Tel. (601) 761-9348 · www.muebleslottus.com"})]}),o.jsxs("div",{className:"rr-doc-title",children:[o.jsx("div",{className:"rr-doc-kicker",children:"Remisión de entrega"}),o.jsxs("div",{className:"rr-doc-number",children:["No. ",R(t.id)]}),i.length>0&&o.jsxs("div",{className:"rr-doc-sub",children:[i.length>1?"Ventas":"Venta"," ",i.map(l=>`#${l}`).join(", ")]})]})]}),o.jsxs("div",{className:"rr-meta-grid",children:[o.jsxs("div",{className:"rr-meta-box",children:[o.jsx("div",{className:"rr-label",children:"Entregar a"}),o.jsx("div",{className:"rr-value rr-value--lg",children:t.cliente_nombre||"—"}),t.cliente_documento&&o.jsxs("div",{className:"rr-sub",children:["C.C. / NIT ",t.cliente_documento]}),c&&o.jsxs("div",{className:"rr-sub",children:["Tel. ",c]}),o.jsxs("div",{className:"rr-address",children:[t.direccion_entrega||"—",d&&o.jsx("span",{children:d})]})]}),o.jsxs("div",{className:"rr-meta-box",children:[o.jsx("div",{className:"rr-label",children:"Fecha de entrega"}),o.jsx("div",{className:"rr-value rr-value--lg",children:yn(t.fecha_entrega,!0)||"—"}),(t.hora_desde||t.hora_hasta)&&o.jsxs("div",{className:"rr-sub",children:["Franja: ",wn((w=t.hora_desde)==null?void 0:w.slice(0,5),(j=t.hora_hasta)==null?void 0:j.slice(0,5))]}),o.jsxs("div",{className:"rr-pairs",children:[o.jsxs("div",{children:[o.jsx("span",{className:"rr-label",children:"Transportador"}),o.jsx("span",{children:Mn(t)||"—"})]}),o.jsxs("div",{children:[o.jsx("span",{className:"rr-label",children:"Asesor"}),o.jsx("span",{children:t.vendedor_nombre||"—"})]})]})]})]}),t.observacion&&o.jsxs("div",{className:"rr-indicaciones",children:[o.jsx("span",{className:"rr-indicaciones-label",children:"Indicaciones:"})," ",t.observacion]}),o.jsxs("div",{className:"rr-section",children:[o.jsxs("div",{className:"rr-section-title",children:["Productos a entregar · ",r," unidad",r===1?"":"es"]}),o.jsxs("table",{className:"rr-table",children:[o.jsx("thead",{children:o.jsxs("tr",{children:[o.jsx("th",{className:"rr-col-cant",children:"Cant."}),o.jsx("th",{className:"rr-col-cat",children:"Categoría"}),o.jsx("th",{className:"rr-col-sub",children:"Subcategoría"}),o.jsx("th",{className:"rr-col-ref",children:"Referencia"}),o.jsx("th",{children:"Descripción"})]})}),o.jsxs("tbody",{children:[a.length===0&&o.jsx("tr",{children:o.jsx("td",{colSpan:"5",className:"rr-empty",children:"Sin productos registrados."})}),a.map(l=>l.tipo==="grupo"?o.jsx("tr",{className:"rr-group-row",children:o.jsxs("td",{colSpan:"5",children:["Juego: ",l.nombre," · ",l.piezas," pieza",l.piezas===1?"":"s",l.observacion&&o.jsxs("span",{className:"rr-group-obs",children:[" — ",l.observacion]})]})},l.key):o.jsxs("tr",{children:[o.jsx("td",{className:"rr-col-cant",children:l.cantidad}),o.jsx("td",{className:"rr-col-cat",children:l.categoria||"—"}),o.jsx("td",{className:"rr-col-sub",children:l.subcategoria||"—"}),o.jsxs("td",{className:"rr-col-ref",children:[o.jsx("div",{className:"rr-prod-name",children:l.referencia||"—"}),l.codigo&&o.jsx("div",{className:"rr-prod-code",children:l.codigo})]}),o.jsxs("td",{className:"rr-col-desc",children:[l.descripcion||(l.tela?"":"—"),l.tela&&o.jsxs("div",{className:"rr-tela",children:[o.jsx("strong",{children:"Tapizado:"})," ",l.tela]})]})]},l.key))]})]})]}),o.jsxs("div",{className:"rr-bottom",children:[o.jsxs("div",{className:"rr-novedades",children:[o.jsx("div",{className:"rr-label",children:"Novedades en la entrega"}),t.novedades&&o.jsx("div",{className:"rr-novedades-text",children:t.novedades}),o.jsxs("div",{className:"rr-lines",children:[o.jsx("span",{}),o.jsx("span",{}),!t.novedades&&o.jsx("span",{})]})]}),o.jsxs("div",{className:`rr-cobro${m?"":" rr-cobro--none"}`,children:[o.jsx("div",{className:"rr-cobro-head",children:m?"Cobrar contra entrega":"Cobro"}),o.jsx("div",{className:"rr-cobro-body",children:m?o.jsxs(o.Fragment,{children:[o.jsx("span",{className:"rr-cobro-value",children:_e(t.saldo)}),o.jsx("span",{className:"rr-cobro-sub",children:we(t.metodo_pago)||"Método por confirmar"})]}):o.jsx("span",{className:"rr-cobro-value rr-cobro-value--sm",children:"Sin saldo pendiente"})})]})]}),o.jsx("div",{className:"rr-firmas",children:o.jsxs("div",{className:"rr-firma rr-firma--recibido",children:[o.jsx("div",{className:"rr-firma-title",children:"Recibí a satisfacción"}),o.jsx("div",{className:"rr-firma-line",children:"Nombre y documento"}),o.jsx("div",{className:"rr-firma-line rr-firma-line--firma",children:"Firma"}),o.jsx("div",{className:"rr-firma-line",children:"Fecha y hora"})]})}),o.jsx("p",{className:"rr-legal",children:"Al firmar este documento, el receptor confirma haber recibido los productos relacionados en perfectas condiciones y a entera satisfacción, de conformidad con las especificaciones acordadas."}),o.jsxs("div",{className:"rr-footer",children:["LOTTUS · Remisión No. ",R(t.id)," · Impreso el"," ",new Date().toLocaleDateString("es-CO",{year:"numeric",month:"long",day:"numeric"})]})]})}),Pn=`/* Remisión de entrega — plantilla imprimible.
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
  table-layout: fixed;
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
  font-size: 0.56rem;
  letter-spacing: 0.025rem;
  white-space: nowrap;
  text-transform: uppercase;
  color: #ffffff;
}

.rr-table td {
  padding: 0.45rem 0.6rem;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: top;
  overflow-wrap: anywhere;
}

.rr-table tbody tr {
  page-break-inside: avoid;
  break-inside: avoid;
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

/* Conserva la segunda columna y su ancho; solo crece el espacio para firmar. */
.rr-firma--recibido { grid-column: 2; }
.rr-firma-line.rr-firma-line--firma { margin-top: 3.8rem; }

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
`,A=816,I=1056,U=11,K=U*96/25.4,de=I-2*K;function kn(e,n){return`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${e}</title>
<link href="https://fonts.googleapis.com/css2?family=Audiowide&display=swap" rel="stylesheet">
<style>
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  @page { size: letter portrait; margin: ${U}mm; }
  @media screen {
    html, body { overflow: hidden; }
    body { padding: ${U}mm; }
  }
  ${Pn}
</style>
</head>
<body>${n}</body>
</html>`}const Xn=({open:e,onClose:n,remision:t,closeLabel:a="Cerrar"})=>{const r=p.useRef(null),i=p.useRef(null),c=p.useRef(null),[d,m]=p.useState(""),[f,b]=p.useState(!1),[w,j]=p.useState(I),[l,T]=p.useState(null),[N,O]=p.useState("hoja"),[v,y]=p.useState(!1);p.useLayoutEffect(()=>{if(!e||!r.current){m(""),b(!1);return}const g=`Remision ${t?R(t.id):""}`,x=kn(g,r.current.outerHTML);x!==d&&(m(x),b(!1))},[e,t]),p.useEffect(()=>{const g=c.current;if(!e||!g)return;const x=new ResizeObserver(([E])=>{const{width:W,height:B}=E.contentRect;T({w:W,h:B})});return x.observe(g),()=>x.disconnect()},[e]);const s=p.useCallback(()=>{var x,E;const g=(x=i.current)==null?void 0:x.contentDocument;(E=g==null?void 0:g.body)!=null&&E.querySelector(".rr-page")&&Promise.race([g.fonts?g.fonts.ready:Promise.resolve(),new Promise(W=>setTimeout(W,900))]).then(()=>{j(Math.max(I,Math.ceil(g.body.getBoundingClientRect().height))),b(!0)})},[]),h=()=>{var x;const g=(x=i.current)==null?void 0:x.contentWindow;!g||!f||(g.focus(),g.print())},_=async()=>{var x,E;const g=(x=i.current)==null?void 0:x.contentDocument;if(!(!(g!=null&&g.body)||!f||v)){y(!0);try{const{default:W}=await Pe(async()=>{const{default:H}=await import("./html2canvas.esm-QH1iLAAe.js");return{default:H}},[],import.meta.url);await((E=document.fonts)==null?void 0:E.load('22px "Audiowide"').catch(()=>{}));const B=await W(g.body,{backgroundColor:"var(--surface)",scale:2,useCORS:!0,logging:!1,width:A,height:g.body.scrollHeight,windowWidth:A,onclone:H=>{const ee=H.createElement("style");ee.textContent="html, body, .rr-page { overflow: visible !important; } .rr-logo { display: inline-block !important; line-height: 1; }",H.head.appendChild(ee)}}),Q=document.createElement("a");Q.href=B.toDataURL("image/png"),Q.download=`remision_${R(t==null?void 0:t.id)}.png`,Q.click()}catch(W){console.error("Error al generar la imagen de la remisión:",W)}finally{y(!1)}}},F=Math.max(1,Math.ceil((w-2*K-1)/de)),ve=l?Math.min(l.w/A,l.h/I,1):0,z=N==="real"?1:ve,je=f&&z>0;return o.jsxs(Oe,{open:e,onClose:n,title:t?`Remisión No. ${R(t.id)}`:"Remisión",size:"xl",className:"rpm-modal",footer:o.jsxs(o.Fragment,{children:[o.jsxs("div",{className:"rpm-info",children:[o.jsxs("div",{className:"rpm-zoom",role:"group","aria-label":"Tamaño de la vista previa",children:[o.jsx("button",{type:"button",className:N==="hoja"?"is-active":"",onClick:()=>O("hoja"),children:"Hoja completa"}),o.jsx("button",{type:"button",className:N==="real"?"is-active":"",onClick:()=>O("real"),children:"100 %"})]}),o.jsxs("span",{className:"rpm-paper",children:["Carta · ",F," hoja",F===1?"":"s"]})]}),o.jsx(te,{variant:"secondary",onClick:n,children:a}),o.jsx(te,{variant:"secondary",icon:Ne,onClick:_,disabled:!f,loading:v,children:"Descargar PNG"}),o.jsx(Se,{documento:()=>d,titulo:`Remisión ${R(t==null?void 0:t.id)}`,imprimirLocal:h,disabled:!f})]}),children:[o.jsx("div",{className:"rpm-visor",ref:c,children:o.jsxs("div",{className:`rpm-hoja${je?"":" is-cargando"}${N==="hoja"?" is-reducida":""}`,style:{width:A*z,height:w*z},onClick:()=>O(g=>g==="hoja"?"real":"hoja"),title:N==="hoja"?"Clic para ver al 100 %":"Clic para ver la hoja completa",children:[d&&o.jsx("iframe",{ref:i,className:"rpm-frame",title:"Vista previa de impresión",srcDoc:d,onLoad:s,tabIndex:-1,style:{width:A,height:w,transform:`scale(${z||1})`}}),Array.from({length:F-1},(g,x)=>o.jsx("div",{className:"rpm-corte",style:{top:(K+(x+1)*de)*z},children:o.jsxs("span",{children:["Hoja ",x+2]})},x))]})}),o.jsx("div",{className:"rpm-plantilla","aria-hidden":"true",children:o.jsx(Nn,{ref:r,remision:t})})]})},J={categorias:[],referencias:[]};let q=null;function Vn(){const[e,n]=p.useState(J);return p.useEffect(()=>{let t=!0;return q||(q=ke.get("/suministros/remisiones/catalogo/").then(a=>a.data||J).catch(()=>(q=null,J))),q.then(a=>{t&&n(a)}),()=>{t=!1}},[]),e}const xe="rp-referencias";function Bn({catalogo:e}){return o.jsx("datalist",{id:xe,children:e.referencias.map(n=>o.jsx("option",{value:n.nombre},n.nombre))})}const Qn=(e={})=>({categoria:null,subcategoria:null,referencia:"",descripcion:"",tela:"",cantidad:1,...e}),Gn=e=>!e.categoria&&!e.subcategoria&&!e.referencia.trim()&&!e.descripcion.trim(),Jn=e=>!e.subcategoria&&!e.referencia.trim()&&!e.descripcion.trim(),Un=e=>({categoria:e.categoria||null,subcategoria:e.subcategoria||null,referencia:e.referencia.trim(),descripcion:e.descripcion.trim(),tela:(e.tela||"").trim(),cantidad:Math.max(1,parseInt(e.cantidad,10)||1)});function Dn({value:e,onChange:n,disabled:t}){const[a,r]=p.useState(!!(e||"").trim()),i=p.useRef(null);p.useEffect(()=>{(e||"").trim()&&r(!0)},[e]);const c=()=>{if(a){r(!1),n("");return}r(!0),setTimeout(()=>{var d;return(d=i.current)==null?void 0:d.focus()},0)};return o.jsxs("div",{className:`rp-tela${a?" is-on":""}`,children:[o.jsxs("button",{type:"button",role:"switch","aria-checked":a,className:"rp-tela__switch",onClick:c,disabled:t,children:[o.jsx("span",{className:"rp-tela__pista","aria-hidden":"true"}),o.jsx("span",{children:a?"Lleva tela o cuero":"¿Lleva tela o cuero?"})]}),a&&o.jsx("input",{ref:i,className:"nr-input",maxLength:200,value:e||"",placeholder:"Material, referencia y color · ej.: Tela Lino · color arena",onChange:d=>n(d.target.value),disabled:t,"aria-label":"Tapizado (tela o cuero)"})]})}function Kn({value:e,original:n,onChange:t}){const a=p.useRef(null),r=e??n;return p.useLayoutEffect(()=>{const i=a.current;i&&(i.style.height="auto",i.style.height=`${i.scrollHeight+2}px`)},[r]),o.jsxs("div",{className:"rp-inv",children:[o.jsx("textarea",{ref:a,className:"nr-input rp-inv__desc",rows:1,value:r,placeholder:n||"Descripción para el cliente: color, tela, medidas, acabados…",onChange:i=>t(i.target.value),"aria-label":"Descripción en la remisión"}),e!=null&&e!==n&&n&&o.jsxs("button",{type:"button",className:"nr-link rp-restore",onClick:()=>t(void 0),children:[o.jsx(le,{})," Usar el texto del inventario"]})]})}function Zn({item:e,catalogo:n,onChange:t,incluido:a=!0,onToggle:r,onRemove:i,original:c,aviso:d,extra:m,error:f,autoFocus:b}){const w=p.useRef(null),j=p.useMemo(()=>{const s={};return n.categorias.forEach(h=>h.subcategorias.forEach(_=>{s[_.id]=h.id})),s},[n]),l=n.categorias.find(s=>s.id===e.categoria);p.useLayoutEffect(()=>{const s=w.current;s&&(s.style.height="auto",s.style.height=`${s.scrollHeight+2}px`)},[e.descripcion]);const T=s=>{const h=s?Number(s):null;t({categoria:h,subcategoria:h&&j[e.subcategoria]===h?e.subcategoria:null})},N=s=>{const h=s?Number(s):null;t({subcategoria:h,categoria:h?j[h]??e.categoria:e.categoria})},O=s=>{const h={referencia:s},_=n.referencias.find(F=>F.nombre.toLowerCase()===s.trim().toLowerCase());_&&!e.categoria&&!e.subcategoria&&(h.categoria=_.categoria,h.subcategoria=_.subcategoria),t(h)},v=!a,y=c!=null&&e.descripcion!==c;return o.jsxs("div",{className:`rp-item${v?" is-off":""}${f?" has-error":""}`,children:[r&&o.jsx("input",{type:"checkbox",className:"nr-check rp-item__check",checked:a,onChange:r,"aria-label":"Incluir en la remisión"}),o.jsxs("div",{className:"rp-item__main",children:[o.jsxs("div",{className:"rp-item__fields",children:[o.jsxs("select",{className:"nr-input rp-cat",value:e.categoria??"",onChange:s=>T(s.target.value),disabled:v,"aria-label":"Categoría",children:[o.jsx("option",{value:"",children:"Categoría"}),n.categorias.map(s=>o.jsx("option",{value:s.id,children:s.nombre},s.id))]}),o.jsxs("select",{className:"nr-input rp-sub",value:e.subcategoria??"",onChange:s=>N(s.target.value),disabled:v,"aria-label":"Subcategoría",children:[o.jsx("option",{value:"",children:"Subcategoría"}),l?l.subcategorias.map(s=>o.jsx("option",{value:s.id,children:s.nombre},s.id)):n.categorias.map(s=>o.jsx("optgroup",{label:s.nombre,children:s.subcategorias.map(h=>o.jsx("option",{value:h.id,children:h.nombre},h.id))},s.id))]}),o.jsx("input",{className:"nr-input rp-ref",list:xe,placeholder:"Referencia",value:e.referencia,onChange:s=>O(s.target.value),disabled:v,autoFocus:b,"aria-label":"Referencia"}),o.jsxs("label",{className:"rp-cant",children:[o.jsx("span",{children:"Cant."}),o.jsx("input",{type:"number",min:"1",inputMode:"numeric",className:"nr-input",value:e.cantidad,onChange:s=>t({cantidad:s.target.value===""?"":Math.max(1,parseInt(s.target.value,10)||1)}),disabled:v})]}),o.jsx("textarea",{ref:w,className:"nr-input rp-desc",rows:1,placeholder:"Descripción para el cliente: color, tela, medidas, acabados…",value:e.descripcion,onChange:s=>t({descripcion:s.target.value}),disabled:v,"aria-label":"Descripción"}),o.jsx(Dn,{value:e.tela,onChange:s=>t({tela:s}),disabled:v})]}),(d||m||y||f)&&!v&&o.jsxs("div",{className:"rp-item__foot",children:[f&&o.jsx("span",{className:"rp-error",children:f}),d,m,y&&o.jsxs("button",{type:"button",className:"nr-link rp-restore",onClick:()=>t({descripcion:c}),children:[o.jsx(le,{})," Usar el texto del pedido"]})]})]}),i&&o.jsx("button",{type:"button",className:"nr-icon-btn rp-item__remove",onClick:i,title:"Quitar","aria-label":"Quitar producto",children:o.jsx(De,{})})]})}export{An as A,hn as B,wn as C,Ln as D,gn as E,Yn as F,vn as G,Kn as H,Hn as M,Zn as P,Bn as R,Dn as T,Tn as a,R as b,Vn as c,yn as d,pe as e,Z as f,G as g,bn as h,Rn as i,Qn as j,Gn as k,jn as l,$n as m,Te as n,Un as o,qn as p,Jn as q,Mn as r,re as s,xn as t,In as u,zn as v,Fn as w,we as x,Xn as y,L as z};
