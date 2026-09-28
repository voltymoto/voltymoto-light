/* Volty U1 chassis viewer. Needs three.min.js (r147) loaded first.
   The model is built from primitives to match the published chassis render:
   head tube, twin top and down tubes, the battery bay, the rear rack cage,
   the diagonal struts and the swingarm cradle. It is illustrative, not CAD. */
(function () {
  var stage = document.getElementById('u1Stage');
  if (!stage || !window.THREE) return;
  var T = window.THREE;
  var canvasWrap = stage.querySelector('.cs-gl');
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var VI = function () { return document.documentElement.lang === 'vi'; };

  /* ---------- renderer ---------- */
  var renderer;
  try {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  canvasWrap.appendChild(renderer.domElement);

  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(28, 16 / 10, 0.05, 50);

  /* studio environment for reflections: a soft grey room with two softboxes */
  (function () {
    var pm = new T.PMREMGenerator(renderer);
    var env = new T.Scene();
    var room = new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.MeshBasicMaterial({ color: 0x6f6f6f, side: T.BackSide }));
    env.add(room);
    function box(x, y, z, w, h, c) {
      var m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: c, side: T.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    }
    box(-4, 5, 4, 6, 3, 0xffffff);
    box(5, 3, -3, 3, 5, 0xdcdcdc);
    box(0, -6, 0, 12, 12, 0x3a3a3a);
    box(6, 1, 5, 2, 4, 0xffffff);
    scene.environment = pm.fromScene(env, 0.04).texture;
    pm.dispose();
  })();

  scene.add(new T.HemisphereLight(0xffffff, 0x5a5a5a, 0.55));
  var key = new T.DirectionalLight(0xffffff, 1.6); key.position.set(-2.5, 3.5, 3); scene.add(key);
  var rim = new T.DirectionalLight(0xffffff, 0.9); rim.position.set(3, 1.5, -3); scene.add(rim);

  /* ---------- materials ---------- */
  var mFrame = new T.MeshStandardMaterial({ color: 0x0b0b0b, metalness: 0.45, roughness: 0.4, envMapIntensity: 0.7 });
  var mBox = new T.MeshStandardMaterial({ color: 0x0d0d0d, metalness: 0.25, roughness: 0.6, envMapIntensity: 0.6, transparent: true, opacity: 1 });
  var mPlate = new T.MeshStandardMaterial({ color: 0x101010, metalness: 0.4, roughness: 0.5, envMapIntensity: 0.6 });
  var mHole = new T.MeshBasicMaterial({ color: 0x050505 });
  var mPack = new T.MeshStandardMaterial({ color: 0x8c8f93, metalness: 0.8, roughness: 0.3, transparent: true, opacity: 0 });
  var mPackTop = new T.MeshStandardMaterial({ color: 0x1b1b1b, metalness: 0.2, roughness: 0.6, transparent: true, opacity: 0 });
  var mRed = new T.MeshBasicMaterial({ color: 0xe2231a });

  var root = new T.Group(); scene.add(root);
  var gFront = new T.Group(), gMid = new T.Group(), gRear = new T.Group(), gBox = new T.Group(), gPacks = new T.Group();
  root.add(gFront, gMid, gRear, gBox, gPacks);

  var curves = []; // for the load path particles
  var R = 0.021;
  function V(x, y, z) { return new T.Vector3(x, y, z); }
  function capAt(p, dir, r, grp) {
    var c = new T.Mesh(new T.CircleGeometry(r * 0.72, 20), mHole);
    c.position.copy(p).addScaledVector(dir, 0.0005);
    c.lookAt(p.clone().add(dir)); grp.add(c);
    var ring = new T.Mesh(new T.RingGeometry(r * 0.72, r, 20), mFrame);
    ring.position.copy(c.position); ring.quaternion.copy(c.quaternion); grp.add(ring);
  }
  function tube(pts, grp, r, opts) {
    r = r || R; opts = opts || {};
    var curve = new T.CatmullRomCurve3(pts, false, 'catmullrom', 0.2);
    var mesh = new T.Mesh(new T.TubeGeometry(curve, Math.max(24, pts.length * 20), r, 18, false), mFrame);
    grp.add(mesh);
    if (opts.caps !== false) {
      capAt(curve.getPoint(0), curve.getTangent(0).negate(), r, grp);
      capAt(curve.getPoint(1), curve.getTangent(1), r, grp);
    }
    if (opts.load) curves.push({ curve: curve, grp: grp });
    return curve;
  }
  function node(p, grp, r) {
    var n = new T.Mesh(new T.CylinderGeometry(r || 0.03, r || 0.03, 0.03, 24), mFrame);
    n.rotation.x = Math.PI / 2; n.position.copy(p); grp.add(n);
    capAt(V(p.x, p.y, p.z + 0.015 * Math.sign(p.z || 1)), V(0, 0, Math.sign(p.z || 1)), r || 0.03, grp);
  }
  function plate(shapePts, z, grp, holes, t) {
    var s = new T.Shape(); shapePts.forEach(function (p, i) { i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]); });
    (holes || []).forEach(function (h) { var hp = new T.Path(); hp.absarc(h[0], h[1], h[2], 0, Math.PI * 2, false); s.holes.push(hp); });
    var g = new T.ExtrudeGeometry(s, { depth: t || 0.008, bevelEnabled: false });
    var m = new T.Mesh(g, mPlate); m.position.z = z - (t || 0.008) / 2; grp.add(m); return m;
  }

  /* ---------- frame, both sides ---------- */
  [1, -1].forEach(function (s) {
    var z = 0.125 * s;
    // front section: head to box front nodes
    tube([V(-0.61, 0.36, 0.035 * s), V(-0.52, 0.335, 0.09 * s), V(-0.38, 0.29, z), V(-0.28, 0.255, z)], gFront, R, { load: true });
    tube([V(-0.645, 0.24, 0.03 * s), V(-0.59, 0.1, 0.08 * s), V(-0.47, -0.1, z), V(-0.35, -0.235, z)], gFront, R, { load: true });
    // mid: along box top and bottom
    tube([V(-0.28, 0.255, z), V(0.34, 0.255, z)], gMid, R * 0.9, { load: true });
    tube([V(-0.35, -0.235, z), V(-0.1, -0.27, z), V(0.14, -0.335, z)], gMid, R * 0.9, { load: true });
    // diagonal strut from rear cage to the lower node
    tube([V(0.8, 0.225, z * 1.06), V(0.5, 0.0, z * 1.04), V(0.28, -0.17, z), V(0.14, -0.335, z)], gMid, R, { load: true });
    // swingarm cradle loop
    tube([V(0.14, -0.335, z), V(0.19, -0.45, z * 0.95), V(0.33, -0.5, z * 0.9), V(0.45, -0.45, z * 0.9), V(0.47, -0.22, z * 0.9), V(0.45, 0.02, z * 0.9)], gMid, R, { load: true });
    // rear rack cage
    tube([V(0.34, 0.255, z), V(0.5, 0.3, z), V(0.86, 0.305, z)], gRear, R, { load: true });
    tube([V(0.42, 0.14, z), V(0.86, 0.15, z)], gRear, R * 0.9);
    tube([V(0.6, 0.297, z), V(0.6, 0.145, z)], gRear, R * 0.85, { caps: false });
    tube([V(0.86, 0.305, z), V(0.86, 0.15, z)], gRear, R * 0.85, { caps: false });
    node(V(-0.28, 0.255, z), gMid, 0.026);
    node(V(-0.35, -0.235, z), gMid, 0.026);
    node(V(0.14, -0.335, z), gMid, 0.028);
    node(V(0.34, 0.255, z), gMid, 0.026);
    // rear mounting plates with holes
    plate([[0.87, 0.1], [0.89, 0.1], [0.89, 0.34], [0.87, 0.34]].map(function (p) { return [p[0], p[1]]; }), z, gRear, [], 0.006);
    // swingarm plate with pivot and shock holes
    plate([[0.38, 0.06], [0.5, 0.06], [0.52, -0.2], [0.49, -0.44], [0.4, -0.44], [0.36, -0.2]], z * 0.82, gMid,
      [[0.45, -0.34, 0.022], [0.44, -0.05, 0.012], [0.45, -0.18, 0.012]], 0.01);
    // small brackets under the frame
    plate([[0.12, -0.34], [0.2, -0.34], [0.18, -0.43], [0.14, -0.43]], z * 0.7, gMid, [[0.16, -0.395, 0.011]], 0.008);
  });
  // cross tubes along z
  [[V(0.86, 0.305, 0), 0.125], [V(0.86, 0.15, 0), 0.125], [V(0.6, 0.297, 0), 0.125], [V(0.45, 0.02, 0), 0.112]].forEach(function (c) {
    var p = c[0], w = c[1];
    var grp = p.x > 0.55 ? gRear : gMid;
    tube([V(p.x, p.y, -w), V(p.x, p.y, w)], grp, R * 0.85, { caps: false });
  });
  // head tube
  (function () {
    var top = V(-0.6, 0.43, 0), bot = V(-0.665, 0.18, 0);
    var dir = top.clone().sub(bot); var len = dir.length(); dir.normalize();
    var ht = new T.Mesh(new T.CylinderGeometry(0.043, 0.043, len, 32, 1, true), mFrame);
    ht.position.copy(top.clone().add(bot).multiplyScalar(0.5));
    ht.quaternion.setFromUnitVectors(V(0, 1, 0), dir); gFront.add(ht);
    capAt(top, dir, 0.043, gFront); capAt(bot, dir.clone().negate(), 0.043, gFront);
    var inner = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, len * 0.98, 24, 1, true), new T.MeshBasicMaterial({ color: 0x050505, side: T.BackSide }));
    inner.position.copy(ht.position); inner.quaternion.copy(ht.quaternion); gFront.add(inner);
    // gussets from head tube to both rails
    [1, -1].forEach(function (s) {
      tube([V(-0.63, 0.3, 0.03 * s), V(-0.56, 0.2, 0.07 * s), V(-0.5, 0.05, 0.1 * s)], gFront, R * 0.7);
    });
  })();

  /* ---------- battery bay ---------- */
  (function () {
    var prof = [[-0.3, 0.24], [0.34, 0.24], [0.34, -0.06], [0.2, -0.31], [-0.32, -0.31], [-0.32, 0.18]];
    var s = new T.Shape(); prof.forEach(function (p, i) { i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]); }); s.closePath();
    var w = 0.22;
    var g = new T.ExtrudeGeometry(s, { depth: w, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 });
    var box = new T.Mesh(g, mBox); box.position.z = -w / 2; gBox.add(box);
    var edges = new T.LineSegments(new T.EdgesGeometry(g, 30), new T.LineBasicMaterial({ color: 0x3a3a3a, transparent: true, opacity: 0.9 }));
    edges.position.z = -w / 2; gBox.add(edges);
    // side panel crease and bolt heads
    [1, -1].forEach(function (sd) {
      var zz = sd * (w / 2 + 0.0075);
      var crease = new T.BufferGeometry().setFromPoints([V(-0.24, 0.2, zz), V(0.08, -0.1, zz), V(0.3, -0.1, zz)]);
      gBox.add(new T.Line(crease, new T.LineBasicMaterial({ color: 0x2c2c2c })));
      [[-0.26, 0.16], [0.28, 0.16], [0.28, -0.03], [-0.26, -0.25], [0.12, -0.25], [0.0, 0.05]].forEach(function (b) {
        var bolt = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, 0.004, 12), mHole);
        bolt.rotation.x = Math.PI / 2; bolt.position.set(b[0], b[1], zz); gBox.add(bolt);
      });
    });
    // open top: dark inset
    var inset = new T.Mesh(new T.PlaneGeometry(0.6, w - 0.02), new T.MeshBasicMaterial({ color: 0x060606 }));
    inset.rotation.x = -Math.PI / 2; inset.position.set(0.02, 0.2465, 0); gBox.add(inset);
    // the edges material follows xray
    gBox.userData.edges = edges;
  })();

  /* ---------- two removable packs (hidden until x-ray or explode) ---------- */
  [-0.1, 0.14].forEach(function (x) {
    var p = new T.Group();
    var body = new T.Mesh(new T.BoxGeometry(0.2, 0.34, 0.17), mPack); p.add(body);
    var lid = new T.Mesh(new T.BoxGeometry(0.205, 0.04, 0.175), mPackTop); lid.position.y = 0.19; p.add(lid);
    var handle = new T.Mesh(new T.TorusGeometry(0.035, 0.008, 8, 20, Math.PI), mPackTop); handle.position.y = 0.21; p.add(handle);
    p.position.set(x, 0.02, 0); p.userData.base = p.position.clone();
    gPacks.add(p);
  });

  /* contact shadow */
  var sh = (function () {
    var c = document.createElement('canvas'); c.width = c.height = 256;
    var x = c.getContext('2d'); var g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(.5, 'rgba(0,0,0,.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    var m = new T.Mesh(new T.PlaneGeometry(2.1, 0.9), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(0.1, -0.78, 0); scene.add(m); return m;
  })();

  /* ---------- load path particles ---------- */
  var pCount = curves.length * 6;
  var pGeo = new T.BufferGeometry(); var pPos = new Float32Array(pCount * 3);
  pGeo.setAttribute('position', new T.BufferAttribute(pPos, 3));
  var dot = (function () {
    var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d');
    var g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,120,100,1)'); g.addColorStop(.35, 'rgba(226,35,26,.9)'); g.addColorStop(1, 'rgba(226,35,26,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new T.CanvasTexture(c);
  })();
  var pMat = new T.PointsMaterial({ size: 0.11, map: dot, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 });
  var particles = new T.Points(pGeo, pMat); particles.frustumCulled = false; scene.add(particles);

  /* ---------- centring ---------- */
  root.position.set(-0.12, 0.05, 0);
  var target = V(0, 0, 0);

  /* ---------- camera rig: yaw / pitch / distance with inertia ---------- */
  var rig = { yaw: -0.62, pitch: 0.2, dist: 3.3 }, goal = { yaw: rig.yaw, pitch: rig.pitch, dist: rig.dist };
  var vel = 0, auto = !reduce, dragging = false, lastX = 0, lastY = 0, interacted = false;
  function place() {
    var cp = Math.cos(rig.pitch);
    camera.position.set(target.x + rig.dist * cp * Math.sin(rig.yaw), target.y + rig.dist * Math.sin(rig.pitch), target.z + rig.dist * cp * Math.cos(rig.yaw));
    camera.lookAt(target);
  }

  /* ---------- state: modes ---------- */
  var mode = { xray: 0, explode: 0, load: 0 }, modeGoal = { xray: 0, explode: 0, load: 0 };

  /* ---------- UI ---------- */
  var readout = stage.querySelector('.cs-deg b');
  var dial = stage.querySelector('.cs-dial i');
  var hint = stage.querySelector('.cs-hint');
  var card = stage.querySelector('.cs-card');
  var btns = stage.querySelectorAll('[data-cs]');
  function BASE(){ return 3.3 + 0.55 * (modeGoal.explode > 0.5 ? 1 : 0); }
  var views = { q: { yaw: -0.62, pitch: 0.2 }, side: { yaw: 0, pitch: 0.04 }, front: { yaw: -Math.PI / 2, pitch: 0.08 }, top: { yaw: 0, pitch: 1.35 }, rear: { yaw: Math.PI * 0.62, pitch: 0.22 } };

  var HS = [
    { p: V(-0.6, 0.47, 0), yaw: -0.95, pitch: 0.25,
      en: ['Steering head', 'The head tube and twin down tubes carry the front deck and the front rack mount. Front loads go into the frame here, not into the bodywork.'],
      vi: ['Cổ lái', 'Cổ lái và hai ống xuống chịu lực cho sàn trước và điểm gắn giá trước. Tải phía trước đi thẳng vào khung xe, không vào dàn vỏ.'] },
    { p: V(0.02, 0.3, 0), yaw: -0.2, pitch: 0.7, xray: 1,
      en: ['Main battery bay', 'Removable packs stand upright under the seat line and lift out by the handle. A swap takes under two minutes, with no tools.'],
      vi: ['Khoang pin chính', 'Các khối pin tháo rời đặt đứng dưới đường yên và nhấc ra bằng tay cầm. Đổi pin dưới 2 phút, không cần dụng cụ.'] },
    { p: V(0.86, 0.34, 0), yaw: 2.1, pitch: 0.3,
      en: ['Rear rack cage', 'The rear deck bolts straight to this cage. Front deck, mid rails and rear deck each mount to the frame independently.'],
      vi: ['Khung giá sau', 'Giá chở sau bắt vít trực tiếp vào khung này. Sàn trước, thanh ray giữa và giá sau đều bắt độc lập vào khung xe.'] },
    { p: V(0.47, -0.3, 0.14), yaw: 0.55, pitch: -0.05,
      en: ['Swingarm and shock mounts', 'A conventional swingarm and twin rear shocks bolt here. Parts a street mechanic in Vietnam already stocks.'],
      vi: ['Điểm gắn gắp và giảm xóc', 'Gắp tiêu chuẩn và giảm xóc đôi phía sau bắt tại đây. Phụ tùng mà tiệm sửa xe nào ở Việt Nam cũng có sẵn.'] },
    { p: V(0.46, -0.02, 0.15), yaw: 0.25, pitch: 0.1, load: 1,
      en: ['Load path', 'Diagonal struts tie the rack cage to the lower frame node, so the load runs through the tubes. 200 kg maximum payload, rider included.'],
      vi: ['Đường truyền tải', 'Thanh chéo nối khung giá sau với nút khung dưới, để tải trọng đi qua các ống khung. Tải trọng tối đa 200 kg, bao gồm người lái.'] }
  ];
  var hsWrap = stage.querySelector('.cs-hs');
  HS.forEach(function (h, i) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'cs-pin';
    b.innerHTML = '<span>' + ('0' + (i + 1)) + '</span>';
    b.setAttribute('aria-label', h.en[0]);
    b.addEventListener('click', function (e) { e.stopPropagation(); focusHS(i); });
    hsWrap.appendChild(b); h.el = b;
  });
  var activeHS = -1;
  function focusHS(i) {
    if (activeHS === i) { closeCard(); return; }
    activeHS = i; var h = HS[i]; auto = false; syncBtns();
    goal.yaw = nearestYaw(h.yaw); goal.pitch = h.pitch; goal.dist = 2.5;
    modeGoal.xray = h.xray ? 1 : modeGoal.xray; modeGoal.load = h.load ? 1 : modeGoal.load; syncBtns();
    var t = VI() ? h.vi : h.en;
    card.querySelector('.cs-card-k').textContent = (VI() ? 'Chi tiết ' : 'Detail ') + '0' + (i + 1) + ' / 05';
    card.querySelector('h4').textContent = t[0]; card.querySelector('p').textContent = t[1];
    card.hidden = false; card.dataset.i = i;
    HS.forEach(function (x, j) { x.el.classList.toggle('on', j === i); });
    kick();
  }
  function closeCard() { activeHS = -1; card.hidden = true; HS.forEach(function (x) { x.el.classList.remove('on'); }); goal.dist = BASE(); kick(); }
  card.querySelector('.cs-x').addEventListener('click', closeCard);
  card.querySelector('.cs-next').addEventListener('click', function () { focusHS(((+card.dataset.i) + 1) % HS.length); });
  function nearestYaw(y) { var k = Math.round((rig.yaw - y) / (Math.PI * 2)); return y + k * Math.PI * 2; }

  function syncBtns() {
    btns.forEach(function (b) {
      var k = b.getAttribute('data-cs'), on = false;
      if (k === 'spin') on = auto;
      else if (k in modeGoal) on = modeGoal[k] > 0.5;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var k = b.getAttribute('data-cs');
      if (k === 'spin') { auto = !auto; if (auto) vel = 0; }
      else if (k in modeGoal) { modeGoal[k] = modeGoal[k] > 0.5 ? 0 : 1; if (k === 'explode' && activeHS < 0) goal.dist = BASE(); }
      else if (k === 'zin') goal.dist = Math.max(1.7, goal.dist - 0.35);
      else if (k === 'zout') goal.dist = Math.min(4.2, goal.dist + 0.35);
      else if (k === 'full') { toggleFull(); }
      else if (views[k]) { auto = false; goal.yaw = nearestYaw(views[k].yaw); goal.pitch = views[k].pitch; goal.dist = BASE(); }
      syncBtns(); kick(); markInteracted();
    });
  });
  function toggleFull() {
    var d = document;
    if (d.fullscreenElement) { d.exitFullscreen && d.exitFullscreen(); }
    else if (stage.requestFullscreen) { stage.requestFullscreen().catch(function () {}); }
  }
  document.addEventListener('fullscreenchange', function () { stage.classList.toggle('is-full', document.fullscreenElement === stage); resize(); });
  function markInteracted() { if (!interacted) { interacted = true; hint.classList.add('gone'); } }

  /* pointer: horizontal drag spins, vertical drag tilts; page scroll stays free on touch */
  var gl = renderer.domElement;
  gl.addEventListener('pointerdown', function (e) {
    dragging = true; lastX = e.clientX; lastY = e.clientY; vel = 0; auto = false; syncBtns();
    gl.setPointerCapture && gl.setPointerCapture(e.pointerId); stage.classList.add('grab'); markInteracted(); kick();
  });
  gl.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX, dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY;
    var k = 0.0085;
    goal.yaw -= dx * k; vel = -dx * k;
    goal.pitch = Math.max(-0.35, Math.min(1.4, goal.pitch + dy * k * 0.7));
    kick();
  });
  function up() { dragging = false; stage.classList.remove('grab'); }
  gl.addEventListener('pointerup', up); gl.addEventListener('pointercancel', up);
  gl.addEventListener('wheel', function (e) {
    if (!(e.ctrlKey || e.metaKey || stage.classList.contains('is-full'))) return;
    e.preventDefault(); goal.dist = Math.max(1.7, Math.min(4.2, goal.dist + e.deltaY * 0.002)); kick();
  }, { passive: false });
  gl.addEventListener('dblclick', function () { goal.dist = goal.dist > 2.6 ? 2.2 : BASE(); kick(); });
  stage.addEventListener('keydown', function (e) {
    var used = true;
    if (e.key === 'ArrowLeft') goal.yaw += 0.25; else if (e.key === 'ArrowRight') goal.yaw -= 0.25;
    else if (e.key === 'ArrowUp') goal.pitch = Math.min(1.4, goal.pitch + 0.15); else if (e.key === 'ArrowDown') goal.pitch = Math.max(-0.35, goal.pitch - 0.15);
    else if (e.key === '+' || e.key === '=') goal.dist = Math.max(1.7, goal.dist - 0.3); else if (e.key === '-') goal.dist = Math.min(4.2, goal.dist + 0.3);
    else if (e.key === 'Escape') closeCard();
    else used = false;
    if (used) { e.preventDefault(); auto = false; syncBtns(); markInteracted(); kick(); }
  });

  /* ---------- sizing and visibility ---------- */
  function resize() {
    var w = canvasWrap.clientWidth, h = canvasWrap.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = Math.max(26, 2 * Math.atan(Math.tan(22.2 * Math.PI / 180) / (w / h)) * 180 / Math.PI); camera.updateProjectionMatrix(); kick();
  }
  window.addEventListener('resize', resize);
  var visible = true;
  if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) kick(); }).observe(stage);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) kick(); });
  document.addEventListener('volty:lang', function () { if (activeHS >= 0) { var i = activeHS; activeHS = -1; focusHS(i); } });

  /* ---------- loop ---------- */
  var running = false, clock = new T.Clock(), tmp = new T.Vector3();
  function kick() { if (!running) { running = true; clock.getDelta(); requestAnimationFrame(frame); } }
  function ease(a, b, k) { return a + (b - a) * k; }
  function frame() {
    var dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (auto && !dragging) goal.yaw -= dt * 0.35;
    else if (!dragging && Math.abs(vel) > 0.0001) { goal.yaw += vel; vel *= 0.93; }
    var k = 1 - Math.pow(0.001, dt);
    rig.yaw = ease(rig.yaw, goal.yaw, k); rig.pitch = ease(rig.pitch, goal.pitch, k); rig.dist = ease(rig.dist, goal.dist, k);
    for (var m in mode) mode[m] = ease(mode[m], modeGoal[m], 1 - Math.pow(0.002, dt));
    // x-ray
    mBox.opacity = 1 - mode.xray * 0.82; mBox.depthWrite = mode.xray < 0.5;
    gBox.userData.edges.material.color.setHex(mode.xray > 0.5 ? 0xe2231a : 0x3a3a3a);
    var packVis = Math.max(mode.xray, mode.explode);
    mPack.opacity = packVis; mPackTop.opacity = packVis;
    // explode
    var e = mode.explode;
    gFront.position.x = -0.16 * e; gRear.position.x = 0.2 * e; gBox.position.y = -0.1 * e;
    gPacks.children.forEach(function (p, i) { p.position.y = p.userData.base.y + 0.42 * e + i * 0.06 * e; p.position.x = p.userData.base.x + (i ? 0.1 : -0.1) * e; p.rotation.y = e * (i ? 0.35 : -0.35); });
    sh.scale.set(1 + e * 0.25, 1, 1 + e * 0.1);
    // load particles
    pMat.opacity = mode.load; mFrame.emissive = mFrame.emissive || new T.Color(); mFrame.emissive.setRGB(0.2 * mode.load, 0.012 * mode.load, 0.006 * mode.load);
    if (mode.load > 0.01) {
      var n = 0;
      curves.forEach(function (c, ci) {
        for (var j = 0; j < 6; j++) {
          var u = (t * 0.28 + j / 6 + ci * 0.137) % 1;
          c.curve.getPoint(u, tmp); tmp.add(c.grp.position); tmp.add(root.position);
          pPos[n++] = tmp.x; pPos[n++] = tmp.y; pPos[n++] = tmp.z;
        }
      });
      pGeo.attributes.position.needsUpdate = true;
    }
    place();
    renderer.render(scene, camera);
    // hotspots follow the model
    var W = canvasWrap.clientWidth, H = canvasWrap.clientHeight;
    HS.forEach(function (h) {
      tmp.copy(h.p).add(root.position);
      if (h.p.x < -0.5) tmp.x += gFront.position.x; else if (h.p.x > 0.8) tmp.x += gRear.position.x;
      var facing = tmp.clone().sub(camera.position).normalize().dot(tmp.clone().sub(target).normalize()) < 0.25;
      tmp.project(camera);
      h.el.style.transform = 'translate(' + ((tmp.x * 0.5 + 0.5) * W) + 'px,' + ((-tmp.y * 0.5 + 0.5) * H) + 'px)';
      h.el.classList.toggle('back', !facing);
    });
    var deg = ((-rig.yaw * 180 / Math.PI) % 360 + 360) % 360;
    readout.textContent = String(Math.round(deg)).padStart(3, '0') + '°';
    dial.style.transform = 'rotate(' + deg + 'deg)';
    var moving = auto || dragging || Math.abs(goal.yaw - rig.yaw) > 0.0005 || Math.abs(goal.pitch - rig.pitch) > 0.0005 || Math.abs(goal.dist - rig.dist) > 0.001 || Math.abs(vel) > 0.0001 || mode.load > 0.01;
    for (var q in mode) if (Math.abs(mode[q] - modeGoal[q]) > 0.001) moving = true;
    if (moving && visible && !document.hidden) requestAnimationFrame(frame); else running = false;
  }

  resize(); syncBtns(); stage.classList.add('ready'); kick();
})();
