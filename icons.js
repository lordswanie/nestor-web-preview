/* Nestor pixel icons, 12×12 (copied from the current nestoranalytics.hu build).
   k ink · b blue · c cyan · l light blue · p mid blue · g grey · . empty */
(function(){
const ICONS={
 // 01 design & development: a wireframe, code, a launch
 plan:   ['............','.kkkkkkkkkk.','.kbbbbbbbbk.','.kkkkkkkkkk.','.k..k.....k.','.k..k.lll.k.','.k..k.....k.','.k..k.ll..k.','.k..k.....k.','.k..k.lll.k.','.kkkkkkkkkk.','............'],
 code:   ['............','.......b....','...kk.bkk...','..kk..b.kk..','.kk...b..kk.','kk...b....kk','kk...b....kk','.kk..b...kk.','..kkb...kk..','...kk..kk...','....b.......','............'],
 rocket: ['.....kk.....','....kbbk....','....kbbk....','...kbccbk...','...kbccbk...','...kbbbbk...','..kkbbbbkk..','.k.kbbbbk.k.','.k.kkkkkk.k.','....cccc....','.....cc.....','............'],
 // 02 backend & distributed systems: a server, connected nodes, a message, a database
 server: ['............','.kkkkkkkkkk.','.k........k.','.k.c.b.gg.k.','.k........k.','.kkkkkkkkkk.','.k........k.','.k.b.c.gg.k.','.k........k.','.kkkkkkkkkk.','..k......k..','............'],
 nodes:  ['............','.kk......kk.','.kk......kk.','...p....p...','....p..p....','.....bb.....','.....bb.....','....p..p....','...p....p...','.kk......kk.','.kk......kk.','............'],
 mail:   ['............','............','.kkkkkkkkkk.','.kk......kk.','.k.k....k.k.','.k..k..k..k.','.k...bb...k.','.k........k.','.kkkkkkkkkk.','............','............','............'],
 db:     ['............','...kkkkkk...','.kkbbbbbbkk.','.k.kkkkkk.k.','.k........k.','.kk......kk.','.k.kkkkkk.k.','.k........k.','.kk......kk.','...kkkkkk...','............','............'],
 // 03 language models in production: a conversation, a filter in front of the expensive model
 chat:   ['............','.kkkkkkkkkk.','.k........k.','.k........k.','.k..b.b.c.k.','.k..b.b.c.k.','.k........k.','.kkkkkkkkkk.','..kk........','..k.........','............','............'],
 funnel: ['............','.kkkkkkkkkk.','..kllllllk..','...kppppk...','....kbbk....','....kbbk....','....kbbk....','....kkkk....','............','.....cc.....','............','............'],
 // 04 machine learning & analysis: a chart, a fit, a confusion matrix
 bars:   ['............','.k..........','.k.......bb.','.k.......bb.','.k....pp.bb.','.k....pp.bb.','.k.ll.pp.bb.','.k.ll.pp.bb.','.k.ll.pp.bb.','.kkkkkkkkkk.','............','............'],
 scatter:['............','.k......k.b.','.k.......b..','.k....k.b...','.k.....b....','.k.k..b.....','.k...b..k...','.k..b.......','.k.b..k.....','.kkkkkkkkkk.','............','............'],
 matrix: null,
 // 05 search & data collection: a lens, the web, a document, speech
 search: ['............','..kkkk......','.kcc..k.....','.kc...k.....','.k....k.....','.k....k.....','..kkkkk.....','......kk....','.......kk...','........kk..','.........kk.','............'],
 globe:  ['............','....kkkk....','..kk.bb.kk..','.k..b..b..k.','.k..b..b..k.','.kbbbbbbbbk.','.k..b..b..k.','.k..b..b..k.','..kk.bb.kk..','....kkkk....','............','............'],
 doc:    ['............','.kkkkk......','.k...kk.....','.k...k.k....','.k...kkkk...','.k.bbbb..k..','.k.......k..','.k.lllll.k..','.k.......k..','.k.lll...k..','.kkkkkkkkk..','............'],
 mic:    ['............','....kkkk....','....kbbk....','....kbbk....','..k.kbbk.k..','..k.kkkk.k..','..k......k..','...kk..kk...','.....kk.....','.....kk.....','...kkkkkk...','............'],
 // 06 infrastructure & operations: a rack, a shell, the cloud
 rack:   ['............','..kkkkkkkk..','..k.ggg.ck..','..kkkkkkkk..','..k.ggg.bk..','..kkkkkkkk..','..k.ggg.ck..','..kkkkkkkk..','..k......k..','..kkkkkkkk..','..k......k..','............'],
 term:   ['............','.kkkkkkkkkk.','.kkkkkkkkkk.','.k........k.','.k.c......k.','.k..c.....k.','.k.c..bbb.k.','.k........k.','.k........k.','.kkkkkkkkkk.','............','............'],
 cloud:  ['............','............','.....kkkk...','...kkllllk..','..klllllllk.','.kllllllllk.','.kllllllllk.','..kkkkkkkk..','............','............','............','............'],
 // 07 web & mobile: a browser, a phone app, a notification
 browser:['............','.kkkkkkkkkk.','.k.c.b.p..k.','.kkkkkkkkkk.','.k........k.','.k.bbbb...k.','.k........k.','.k.llllll.k.','.k.llll...k.','.k........k.','.kkkkkkkkkk.','............'],
 phone:  ['............','...kkkkkk...','...kbbbbk...','...kbccbk...','...kbccbk...','...kbbbbk...','...kbbbbk...','...kbbbbk...','...kkkkkk...','...k.kk.k...','...kkkkkk...','............'],
 bell:   ['............','.....kk..cc.','....kkkk.cc.','...kllllk...','...kllllk...','...kllllk...','..kllllllk..','.kllllllllk.','.kkkkkkkkkk.','.....bb.....','............','............']
};
// the confusion matrix is easier to state as values: a strong diagonal, weaker neighbours
ICONS.matrix=(()=>{const V=[['b','l','.','.','.'],['l','b','l','.','.'],['.','l','b','p','.'],['.','.','p','b','l'],['.','.','.','l','b']];
  const g=Array.from({length:12},()=>Array(12).fill('.'));
  V.forEach((row,y)=>row.forEach((v,x)=>{for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)g[1+y*2+dy][1+x*2+dx]=v}));
  return g.map(r=>r.join(''))})();
const ICOL={k:'#121213',b:'#3208EC',c:'#3CF2FF',l:'#C2B5F9',p:'#9984F6',g:'#CBC3D5'};
window.NA_ICONS=ICONS;window.NA_ICOL=ICOL;
})();
