/* ================================================================
   SITE POESIAS — app.jsx
   Frontend para o backend Haskell (Servant + PostgreSQL)
   ================================================================ */

const API_BASE = "";

async function apiFetch(path, opts = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (res.status === 204) return null;
  return res.json();
}

const api = {
  users: {
    getAll:  ()       => apiFetch("/users"),
    getById: id       => apiFetch(`/users/${id}`),
    create:  u        => apiFetch("/users",    { method: "POST", body: JSON.stringify(u) }),
    update:  (id, u)  => apiFetch(`/users/${id}`, { method: "PUT",  body: JSON.stringify(u) }),
  },
  posts: {
    getAll:  ()       => apiFetch("/posts"),
    getById: id       => apiFetch(`/posts/${id}`),
    byUser:  uid      => apiFetch(`/users/${uid}/posts`),
    create:  p        => apiFetch("/posts",    { method: "POST", body: JSON.stringify(p) }),
    update:  (id, p)  => apiFetch(`/posts/${id}`,  { method: "PUT",  body: JSON.stringify(p) }),
    delete:  id       => apiFetch(`/posts/${id}`,  { method: "DELETE" }),
  },
  comments: {
    byPost: pid => apiFetch(`/comments/post/${pid}`),
    create: c   => apiFetch("/comments", { method: "POST", body: JSON.stringify(c) }),
  },
  likes: {
    create: l  => apiFetch("/likes",      { method: "POST",   body: JSON.stringify(l) }),
    delete: id => apiFetch(`/likes/${id}`, { method: "DELETE" }),
  },
  favorites: {
    create: f  => apiFetch("/favorites",       { method: "POST",   body: JSON.stringify(f) }),
    delete: id => apiFetch(`/favorites/${id}`, { method: "DELETE" }),
  },
  follows: {
    create: f  => apiFetch("/follows",       { method: "POST",   body: JSON.stringify(f) }),
    delete: id => apiFetch(`/follows/${id}`, { method: "DELETE" }),
  },
};

const ls = {
  get(k, d = null) {
    try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : d; }
    catch { return d; }
  },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

function adaptUser(u) {
  return {
    id:     u.id_user,
    nome:   u.nome,
    name:   u.nome,
    senha:  u.senha,
    handle: u.nome.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
    bio:    u.bio    || "",
    city:   u.city   || "",
    accent: u.accent || 200,
    joined: (u.created_at || "2024-01-01").slice(0, 4),
  };
}

function adaptPost(p) {
  return {
    id:         p.id_post,
    authorId:   p.id_user_post,
    title:      p.txt_title || "(sem título)",
    body:       (p.txt_post || "").split("\n"),
    ic_comment: p.ic_comment === true,
    date:       p.created_at || "",
  };
}

function adaptComment(c) {
  return {
    id:       c.id_comment,
    authorId: c.id_user_com,
    date:     c.created_at || "",
    text:     c.txt_comment,
  };
}


const likeStore = {
  data: ls.get("sp_likes", {}),
  subs: new Set(),
  has(pid, uid)  { return !!uid && pid in (this.data[uid] || {}); },
  count(pid)     { return Object.values(this.data).filter(m => pid in m).length; },
  async toggle(pid, uid) {
    if (!uid) return;
    const m = this.data[uid] || (this.data[uid] = {});
    if (pid in m) {
      const id = m[pid]; delete m[pid];
      ls.set("sp_likes", this.data); this.notify();
      if (id > 0) api.likes.delete(id).catch(() => {});
    } else {
      m[pid] = -1; ls.set("sp_likes", this.data); this.notify();
      try {
        const r = await api.likes.create({ id_like: 0, id_user_like: uid, id_post_like: pid });
        m[pid] = r.id_like; ls.set("sp_likes", this.data);
      } catch {}
    }
  },
  notify() { this.subs.forEach(fn => fn()); },
  subscribe(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
};

const favStore = {
  data: ls.get("sp_favs", {}),
  subs: new Set(),
  has(pid, uid)   { return !!uid && pid in (this.data[uid] || {}); },
  userFavs(uid)   { return Object.keys(this.data[uid] || {}).map(Number); },
  async toggle(pid, uid) {
    if (!uid) return;
    const m = this.data[uid] || (this.data[uid] = {});
    if (pid in m) {
      const id = m[pid]; delete m[pid];
      ls.set("sp_favs", this.data); this.notify();
      if (id > 0) api.favorites.delete(id).catch(() => {});
    } else {
      m[pid] = -1; ls.set("sp_favs", this.data); this.notify();
      try {
        const r = await api.favorites.create({ id_favorite: 0, id_user_fav: uid, id_post_fav: pid });
        m[pid] = r.id_favorite; ls.set("sp_favs", this.data);
      } catch {}
    }
  },
  notify() { this.subs.forEach(fn => fn()); },
  subscribe(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
};

const followStore = {
  data: ls.get("sp_follows", {}),
  subs: new Set(),
  isFollowing(ferId, fedId) { return !!ferId && fedId in (this.data[ferId] || {}); },
  followerCount(uid)  { return Object.values(this.data).filter(m => uid in m).length; },
  followingCount(uid) { return Object.keys(this.data[uid] || {}).length; },
  async toggle(ferId, fedId) {
    if (!ferId) return;
    const m = this.data[ferId] || (this.data[ferId] = {});
    if (fedId in m) {
      const id = m[fedId]; delete m[fedId];
      ls.set("sp_follows", this.data); this.notify();
      if (id > 0) api.follows.delete(id).catch(() => {});
    } else {
      m[fedId] = -1; ls.set("sp_follows", this.data); this.notify();
      try {
        const r = await api.follows.create({ id_follow: 0, id_seguidor: ferId, id_seguido: fedId });
        m[fedId] = r.id_follow; ls.set("sp_follows", this.data);
      } catch {}
    }
  },
  notify() { this.subs.forEach(fn => fn()); },
  subscribe(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
};

const commentStore = {
  cache: {},
  subs:  new Set(),
  getSync(pid) { return this.cache[pid] ?? null; },
  async load(pid) {
    if (this.cache[pid] !== undefined) return;
    this.cache[pid] = [];
    try {
      const raw = await api.comments.byPost(pid);
      this.cache[pid] = raw.map(adaptComment);
    } catch {}
    this.notify();
  },
  async add(pid, text, user) {
    try {
      const raw = await api.comments.create({
        id_comment: 0, id_user_com: user.id, id_post_com: pid,
        txt_comment: text, created_at: "",
      });
      const c = adaptComment(raw);
      this.cache[pid] = [...(this.cache[pid] || []), c];
      this.notify();
    } catch (e) { console.error("comment failed:", e); }
  },
  notify() { this.subs.forEach(fn => fn()); },
  subscribe(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
};

const authStore = {
  user: ls.get("sp_session", null),
  subs: new Set(),

  async login(nome, senha) {
    try {
      const users = await api.users.getAll();
      const match = users.find(
        u => u.nome.trim().toLowerCase() === nome.trim().toLowerCase() && u.senha === senha
      );
      if (!match) return "Usuário ou senha incorretos.";
      this.user = adaptUser(match);
      ls.set("sp_session", this.user);
      this.notify(); return null;
    } catch { return "Não foi possível conectar ao servidor."; }
  },

  async signup(nome, senha) {
    if (!nome.trim() || !senha.trim()) return "Preencha todos os campos.";
    if (nome.trim().length < 2) return "Nome deve ter ao menos 2 caracteres.";
    if (senha.length < 4) return "Senha deve ter ao menos 4 caracteres.";
    try {
      const users = await api.users.getAll();
      if (users.find(u => u.nome.trim().toLowerCase() === nome.trim().toLowerCase())) {
        return "Nome já em uso. Tente outro.";
      }
      const accent = Math.floor(Math.random() * 300) + 30;
      const raw = await api.users.create({
        id_user: 0, nome: nome.trim(), senha,
        bio: "", city: "", accent, created_at: "",
      });
      this.user = adaptUser(raw);
      ls.set("sp_session", this.user);
      this.notify(); return null;
    } catch { return "Não foi possível criar conta."; }
  },

  logout() { this.user = null; ls.set("sp_session", null); this.notify(); },

  async updateProfile(patch) {
    if (!this.user) return;
    try {
      const updated = await api.users.update(this.user.id, {
        id_user: this.user.id,
        nome:    this.user.nome,
        senha:   this.user.senha,
        bio:     patch.bio  !== undefined ? patch.bio  : this.user.bio,
        city:    patch.city !== undefined ? patch.city : this.user.city,
        accent:  this.user.accent,
        created_at: "",
      });
      this.user = adaptUser(updated);
    } catch {
      this.user = { ...this.user, ...patch };
    }
    ls.set("sp_session", this.user);
    this.notify();
  },

  notify() { this.subs.forEach(fn => fn()); },
  subscribe(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
};

const {
  useState, useEffect, useRef, useMemo, useContext, createContext, useCallback,
} = React;

const AuthContext = createContext(null);
const DataContext = createContext({ users: [], posts: [], loading: true, apiOk: true, reload: () => {} });
function useAuthCtx() { return useContext(AuthContext); }
function useDataCtx() { return useContext(DataContext); }

function useStore(store) {
  const [, f] = useState(0);
  useEffect(() => store.subscribe(() => f(n => n + 1)), []);
}
function useLike(pid) {
  const { user } = useAuthCtx() || {};
  useStore(likeStore);
  return [likeStore.has(pid, user?.id), likeStore.count(pid)];
}
function useFav(pid) {
  const { user } = useAuthCtx() || {};
  useStore(favStore);
  return [favStore.has(pid, user?.id)];
}
function useComments(pid) {
  const [, f] = useState(0);
  useEffect(() => {
    commentStore.load(pid);
    return commentStore.subscribe(() => f(n => n + 1));
  }, [pid]);
  return [commentStore.getSync(pid), (text, user) => commentStore.add(pid, text, user)];
}
function useFollowState(authorId) {
  const { user } = useAuthCtx() || {};
  useStore(followStore);
  return [
    followStore.isFollowing(user?.id, authorId),
    followStore.followerCount(authorId),
    () => user && followStore.toggle(user.id, authorId),
  ];
}
function useAuthUser() {
  const [u, setU] = useState(authStore.user);
  useEffect(() => authStore.subscribe(() => setU(authStore.user)), []);
  return u;
}

const MONTHS = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
function fmtDate(iso) {
  if (!iso) return "";
  try { const d = new Date(iso + "T00:00:00"); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
  catch { return ""; }
}
function initials(s) { return (s || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase(); }
function poemsByAuthor(posts, authorId, exclude) {
  return posts.filter(p => p.authorId === authorId && (!exclude || p.id !== exclude.id));
}

function Icon({ name, size = 18, stroke = 1.6 }) {
  const c = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round" };
  const P = {
    search:    <><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></>,
    sun:       <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>,
    moon:      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>,
    share:     <><circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.3M8.2 13.2l7.6 4.3"/></>,
    arrowLeft: <path d="M15 5l-7 7 7 7"/>,
    arrowRight:<path d="M9 5l7 7-7 7"/>,
    plus:      <path d="M12 5v14M5 12h14"/>,
    close:     <path d="M6 6l12 12M18 6L6 18"/>,
    quote:     <path d="M9 7H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v3H4M20 7h-4a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h2v3h-3"/>,
    bookmark:  <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z"/>,
    comment:   <path d="M21 12a8 8 0 0 1-11.4 7.2L4 20.5l1.3-3.1A8 8 0 1 1 21 12z"/>,
    user:      <><circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></>,
    check:     <path d="M5 12l5 5L19 7"/>,
    edit:      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>,
    logout:    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>,
    users:     <><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6M17 20a5.5 5.5 0 0 0-2.5-4.6"/></>,
    loader:    <><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8"/></>,
    wifiOff:   <><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.7 16.7 12 21l-4.7-4.3M10.6 10.6a5 5 0 0 1 5.6 5.6M5.3 5.3A12 12 0 0 0 2 11M22 11a12 12 0 0 0-2.6-3M8.3 8.3a7 7 0 0 0-2 5M17.7 8.3a7 7 0 0 1 .6 5"/></>,
    refresh:   <><polyline points="23 4 23 10 17 10"/><path d="M20.5 15a9 9 0 1 1-2.2-5.5L23 10"/></>,
  };
  return <svg {...c} aria-hidden="true">{P[name]}</svg>;
}

function Logo({ onClick }) {
  return (
    <button onClick={onClick} style={A.logo} aria-label="Entre-Rimas — início">
      <span style={A.logoMark}><span style={A.logoLine}/><span style={A.logoLine}/></span>
      <span style={A.logoText}>Entre<span style={{ color: "var(--accent)" }}>‑</span>Rimas</span>
    </button>
  );
}

function Avatar({ user, size = 44 }) {
  const hue = parseInt(user?.accent) || 200;
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%", display: "grid", placeItems: "center", flex: "none",
      background: `oklch(0.92 0.04 ${hue} / 0.55)`, color: `oklch(0.40 0.10 ${hue})`,
      border: "1px solid var(--rule)", fontFamily: "var(--mono)", fontSize: size * 0.32,
      fontWeight: 500, letterSpacing: "0.02em", userSelect: "none",
    }}>
      {initials(user?.name || user?.nome || "?")}
    </span>
  );
}

function Chip({ children, active, onClick }) {
  return <button onClick={onClick} style={{ ...A.chip, ...(active ? A.chipActive : {}) }}>{children}</button>;
}

function Spinner({ size = 20 }) {
  return (
    <span className="spinning" style={{ display: "inline-grid", placeItems: "center", color: "var(--ink-faint)" }}>
      <Icon name="loader" size={size}/>
    </span>
  );
}

function AuthModal({ reason, onClose }) {
  const [tab, setTab] = useState("login");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const { reload } = useDataCtx();

  useEffect(() => {
    const esc = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, []);

  const submit = async () => {
    setErr(""); setLoading(true);
    const e = tab === "login"
      ? await authStore.login(nome, senha)
      : await authStore.signup(nome, senha);
    setLoading(false);
    if (e) setErr(e);
    else { reload(); onClose(); }
  };

  return (
    <div style={A.scrim} onMouseDown={onClose}>
      <div style={A.authCard} onMouseDown={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ ...A.iconBtn, position: "absolute", top: 12, right: 12 }}>
          <Icon name="close"/>
        </button>
        <div style={{ textAlign: "center", marginBottom: reason ? 14 : 22 }}><Logo/></div>
        {reason && <p style={A.authReason}>{reason}</p>}
        <div style={A.authTabs}>
          <button onClick={() => { setTab("login"); setErr(""); }} style={{ ...A.authTab, ...(tab === "login" ? A.authTabActive : {}) }}>Entrar</button>
          <button onClick={() => { setTab("signup"); setErr(""); }} style={{ ...A.authTab, ...(tab === "signup" ? A.authTabActive : {}) }}>Criar conta</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={A.label}>{tab === "login" ? "Nome de usuário" : "Seu nome"}</label>
            <input value={nome} onChange={e => setNome(e.target.value)} autoFocus
              placeholder={tab === "login" ? "seu nome…" : "Como quer ser chamado(a)?"}
              style={A.authField} onKeyDown={e => e.key === "Enter" && submit()}/>
          </div>
          <div>
            <label style={A.label}>Senha</label>
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)}
              placeholder={tab === "login" ? "••••••••" : "Mínimo 4 caracteres"}
              style={A.authField} onKeyDown={e => e.key === "Enter" && submit()}/>
          </div>
          {err && <p style={A.authErr}>{err}</p>}
          <button onClick={submit} disabled={loading || !nome || !senha} style={A.authSubmit}>
            {loading ? <Spinner size={16}/> : tab === "login" ? "Entrar" : "Criar conta"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Header({ onHome, onExplorar, onSeguidos, onSearch, onPublish, onProfile, theme, onToggleTheme, route }) {
  const { user, openAuth, logout } = useAuthCtx();
  const [scrolled, setScrolled] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", h); h();
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    if (!dropOpen) return;
    const close = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [dropOpen]);

  const nb = (label, cb, active) => (
    <button onClick={cb} style={{ ...A.navItem, ...(active ? A.navItemActive : {}) }}>{label}</button>
  );

  return (
    <header style={{ ...A.header, ...(scrolled ? A.headerScrolled : {}) }}>
      <div style={A.headerInner}>
        <Logo onClick={onHome}/>
        <nav style={A.nav}>
          {nb("Acervo",   onHome,       route === "home")}
          {nb("Explorar", onExplorar,  route === "explorar")}
          {nb("Seguidos", onSeguidos,  route === "seguidos")}
        </nav>
        <div style={A.headerRight}>
          <button onClick={onSearch} style={A.iconBtn} aria-label="Buscar"><Icon name="search"/></button>
          <button onClick={onToggleTheme} style={A.iconBtn} aria-label="Alternar tema">
            <Icon name={theme === "light" ? "moon" : "sun"}/>
          </button>
          {user ? (
            <div ref={dropRef} style={{ position: "relative" }}>
              <button onClick={() => setDropOpen(v => !v)} style={A.avatarBtn} aria-label="Menu">
                <Avatar user={user} size={34}/>
              </button>
              {dropOpen && (
                <div style={A.dropdown}>
                  <div style={A.dropHeader}>
                    <span style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>{user.nome}</span>
                    {user.city && <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-faint)" }}>{user.city}</span>}
                  </div>
                  <div style={{ height: 1, background: "var(--rule-soft)", margin: "2px 0" }}/>
                  <button onClick={() => { setDropOpen(false); onPublish(); }} style={A.dropItem}>
                    <Icon name="plus" size={15}/> Publicar poema
                  </button>
                  <button onClick={() => { setDropOpen(false); onProfile(); }} style={A.dropItem}>
                    <Icon name="user" size={15}/> Meu perfil
                  </button>
                  <div style={{ height: 1, background: "var(--rule-soft)", margin: "2px 0" }}/>
                  <button onClick={() => { setDropOpen(false); logout(); }} style={{ ...A.dropItem, color: "var(--ink-faint)" }}>
                    <Icon name="logout" size={15}/> Sair
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button onClick={() => openAuth()} style={A.publishBtn}>
              <Icon name="user" size={15}/><span>Entrar</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function LikeButton({ poem, big }) {
  const { user, openAuth } = useAuthCtx();
  const [liked, count] = useLike(poem.id);
  const go = () => user ? likeStore.toggle(poem.id, user.id) : openAuth("Para curtir, entre ou crie uma conta.");
  return (
    <button onClick={go}
      style={{ ...A.likeBtn, ...(big ? A.likeBtnBig : {}), color: liked ? "var(--accent)" : "var(--ink-soft)" }}
      aria-pressed={liked} aria-label="Curtir">
      <span style={{ display: "grid", placeItems: "center", transform: liked ? "scale(1.08)" : "none", transition: "transform .2s var(--ease)" }}>
        <svg width={big ? 19 : 16} height={big ? 19 : 16} viewBox="0 0 24 24"
          fill={liked ? "var(--accent)" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
          <path d="M12 20s-7-4.6-9.3-9C1.2 8.2 2.6 5 5.8 5c2 0 3.2 1.3 4.2 2.6C11 6.3 12.2 5 14.2 5c3.2 0 4.6 3.2 3.1 6-2.3 4.4-9.3 9-9.3 9z"/>
        </svg>
      </span>
      <span style={{ fontFamily: "var(--mono)", fontSize: big ? 13 : 12 }}>{count}</span>
    </button>
  );
}

function FavButton({ poem, big }) {
  const { user, openAuth } = useAuthCtx();
  const [fav] = useFav(poem.id);
  const go = () => user ? favStore.toggle(poem.id, user.id) : openAuth("Para salvar poemas, entre ou crie uma conta.");
  return (
    <button onClick={go}
      style={{ ...A.likeBtn, ...(big ? A.likeBtnBig : {}), color: fav ? "var(--accent)" : "var(--ink-soft)" }}
      aria-pressed={fav} aria-label={fav ? "Remover dos favoritos" : "Salvar"}>
      <span style={{ display: "grid", placeItems: "center", transform: fav ? "scale(1.08)" : "none", transition: "transform .2s var(--ease)" }}>
        <svg width={big ? 18 : 15} height={big ? 18 : 15} viewBox="0 0 24 24"
          fill={fav ? "var(--accent)" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
          <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1z"/>
        </svg>
      </span>
      {big && <span style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{fav ? "Salvo" : "Salvar"}</span>}
    </button>
  );
}

function CommentCount({ poem, onOpen }) {
  const [list] = useComments(poem.id);
  return (
    <button onClick={() => onOpen(poem)} style={A.likeBtn} aria-label="Comentários">
      <Icon name="comment" size={15}/>
      <span style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{list ? list.length : 0}</span>
    </button>
  );
}

function FollowButton({ authorId }) {
  const { user, openAuth } = useAuthCtx();
  const [following, , toggle] = useFollowState(authorId);
  if (user?.id === authorId) return null;
  const go = () => user ? toggle() : openAuth("Para seguir autores, entre ou crie uma conta.");
  return (
    <button onClick={go} style={{ ...A.publishBtn, ...(following ? A.followingBtn : {}) }} aria-pressed={following}>
      {following
        ? <><Icon name="check" size={14}/><span>Seguindo</span></>
        : <><Icon name="plus" size={14}/><span>Seguir</span></>}
    </button>
  );
}

function PoemCard({ poem, onOpen, onAuthor, featured }) {
  const { users } = useDataCtx();
  const author = useMemo(() => users.find(u => u.id === poem.authorId) || { id: poem.authorId, nome: "Autor", name: "Autor", accent: 200 }, [users, poem.authorId]);
  const [hover, setHover] = useState(false);
  const excerpt = poem.body.filter(l => l !== "").slice(0, featured ? 5 : 3);
  return (
    <article style={{ ...A.card, ...(featured ? A.cardFeatured : {}), ...(hover ? A.cardHover : {}) }}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={A.cardTop}>
        {poem.date && <span className="meta">{fmtDate(poem.date)}</span>}
      </div>
      <button onClick={() => onOpen(poem)} style={A.cardTitleBtn}>
        <h3 style={{ ...A.cardTitle, ...(featured ? A.cardTitleFeatured : {}) }}>{poem.title}</h3>
      </button>
      <div onClick={() => onOpen(poem)} style={A.cardExcerpt}>
        {excerpt.map((l, i) => <div key={i} style={{ minHeight: "1.6em" }}>{l}</div>)}
        <span style={{ ...A.contLink, opacity: hover ? 1 : 0 }}>continuar a ler →</span>
      </div>
      <div style={A.cardFoot}>
        <button onClick={() => onAuthor(author)} style={A.byline}>
          <Avatar user={author} size={28}/>
          <span style={A.bylineName}>{author.name || author.nome}</span>
        </button>
        <div style={A.cardActions}>
          <CommentCount poem={poem} onOpen={onOpen}/>
          <FavButton poem={poem}/>
          <LikeButton poem={poem}/>
        </div>
      </div>
    </article>
  );
}

function CommentSection({ poem }) {
  const { user, openAuth } = useAuthCtx();
  const { users } = useDataCtx();
  const [list, addComment] = useComments(poem.id);
  const [text, setText] = useState("");

  if (!poem.ic_comment) return (
    <div style={{ marginTop: 36, paddingTop: 24, borderTop: "1px solid var(--rule-soft)" }}>
      <p style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-faint)", margin: 0 }}>
        Comentários desativados pelo autor.
      </p>
    </div>
  );

  return (
    <section style={V.comments}>
      <div style={V.sectionHead}>
        <span className="kicker">Comentários · {list ? list.length : "…"}</span>
      </div>
      {user ? (
        <div style={V.composer}>
          <Avatar user={user} size={36}/>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={2}
              placeholder="Deixe uma leitura, um elogio, um verso de resposta…"
              style={V.commentInput}/>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => { const t = text.trim(); if (!t) return; addComment(t, user); setText(""); }}
                disabled={!text.trim()} style={V.commentSubmit}>
                Comentar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => openAuth("Para comentar, entre ou crie uma conta.")} style={V.authPrompt}>
          <Icon name="user" size={15}/> Entre para comentar
        </button>
      )}
      <div style={V.commentList}>
        {list === null && (
          <div style={{ padding: "20px 0" }}><Spinner/></div>
        )}
        {list !== null && list.length === 0 && (
          <p style={V.empty}>Seja a primeira pessoa a comentar.</p>
        )}
        {list !== null && list.map(c => {
          const a = users.find(u => u.id === c.authorId) || { id: c.authorId, nome: "Autor", name: "Autor", accent: 200 };
          const isMe = user && c.authorId === user.id;
          return (
            <div key={c.id} style={V.commentItem}>
              <Avatar user={a} size={36}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={V.commentHead}>
                  <span style={V.commentName}>
                    {a.name || a.nome}
                    {isMe && <span style={V.youTag}>você</span>}
                  </span>
                  {c.date && <span className="meta">{fmtDate(c.date)}</span>}
                </div>
                <p style={V.commentText}>{c.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}


function Home({ filter, setFilter, onOpen, onAuthor, onPublish }) {
  const { user, openAuth } = useAuthCtx();
  const { posts, users, loading, apiOk } = useDataCtx();
  useStore(favStore);
  useStore(likeStore);

  const sorted = useMemo(() => [...posts].sort((a, b) => b.id - a.id), [posts]);
  const featured = useMemo(() => sorted[0] || null, [sorted]);

  const rest = useMemo(() => {
    if (filter === "Salvos") {
      const ids = user ? favStore.userFavs(user.id) : [];
      return sorted.filter(p => ids.includes(p.id));
    }
    return featured ? sorted.filter(p => p.id !== featured.id) : sorted;
  }, [filter, sorted, user, featured]);

  if (loading) return (
    <main style={{ ...V.page, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
      <div style={{ textAlign: "center" }}>
        <Spinner size={32}/>
        <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-faint)", marginTop: 16 }}>Carregando poemas…</p>
      </div>
    </main>
  );

  if (!apiOk && posts.length === 0) return (
    <main style={{ ...V.page, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
      <div style={{ textAlign: "center", maxWidth: 380 }}>
        <div style={{ color: "var(--ink-faint)", marginBottom: 16 }}><Icon name="wifiOff" size={40} stroke={1.2}/></div>
        <h2 style={{ fontFamily: "var(--serif)", fontWeight: 400, fontSize: 26, color: "var(--ink)", margin: "0 0 10px" }}>Servidor indisponível</h2>
        <p style={{ fontFamily: "var(--serif)", color: "var(--ink-soft)", margin: "0 0 20px", lineHeight: 1.55 }}>
          Não foi possível conectar ao backend em <code style={{ fontFamily: "var(--mono)", fontSize: 13 }}>{API_BASE}</code>.<br/>
          Verifique se o servidor Haskell está rodando.
        </p>
      </div>
    </main>
  );

  return (
    <main className="view-enter" style={V.page}>
      <section style={V.hero}>
        <div style={V.heroText}>
          <span className="kicker">Acervo vivo · poesia compartilhada</span>
          <h1 style={V.heroTitle}>
            O que não cabe na conversa<br/>
            mora <em style={{ color: "var(--accent)", fontWeight: 400 }}>entre as rimas</em>.
          </h1>
          <p style={V.heroSub}>Um lugar para poetas publicarem, lerem e guardarem versos. Sem ruído, sem pressa.</p>
          <div style={V.heroStats}>
            <button onClick={user ? onPublish : () => openAuth("Crie uma conta para publicar seu primeiro poema.")} style={V.heroCta}>
              <Icon name="quote" size={16}/><span>Publicar um poema</span>
            </button>
            <span className="meta">{posts.length} poemas · {users.length} autores</span>
          </div>
        </div>
        <div style={V.heroRule} aria-hidden="true">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} style={{ ...V.heroRuleLine, width: `${100 - i * 7}%`, opacity: 1 - i * 0.085 }}/>
          ))}
        </div>
      </section>
      <hr className="rule" style={{ margin: "0 0 46px" }}/>
      {featured && (
        <section style={{ marginBottom: 54 }}>
          <div style={V.sectionHead}><span className="kicker">Poema em destaque</span></div>
          <PoemCard poem={featured} onOpen={onOpen} onAuthor={onAuthor} featured/>
        </section>
      )}
      <section>
        <div style={V.acervoHead}>
          <h2 style={V.h2}>Acervo</h2>
          <div style={V.chips}>
            <Chip active={filter === "Todos"}  onClick={() => setFilter("Todos")}>Todos</Chip>
            <Chip active={filter === "Salvos"} onClick={() => { user ? setFilter("Salvos") : openAuth("Entre para ver seus poemas salvos."); }}>
              ☆ Salvos
            </Chip>
          </div>
        </div>
        <div style={V.grid}>
          {rest.map(p => <PoemCard key={p.id} poem={p} onOpen={onOpen} onAuthor={onAuthor}/>)}
        </div>
        {rest.length === 0 && (
          <p style={V.empty}>{filter === "Salvos"
            ? "Você ainda não salvou nenhum poema. Toque no marcador para guardar."
            : "Nenhum poema no acervo ainda."}</p>
        )}
      </section>
    </main>
  );
}

function Explorar({ onOpen, onAuthor }) {
  const { posts, loading } = useDataCtx();
  useStore(likeStore);
  const sorted = useMemo(
    () => [...posts].sort((a, b) => likeStore.count(b.id) - likeStore.count(a.id)),
    [posts]
  );
  return (
    <main className="view-enter" style={V.page}>
      <div style={{ marginBottom: 36 }}>
        <span className="kicker">Do mais curtido ao menos curtido</span>
        <h1 style={{ ...V.h2, marginTop: 6, fontSize: "calc(36px * var(--type-scale))" }}>Explorar</h1>
      </div>
      {loading ? (
        <div style={{ padding: "60px 0", display: "flex", justifyContent: "center" }}><Spinner size={28}/></div>
      ) : (
        <div style={V.grid}>
          {sorted.map((p, i) => (
            <div key={p.id} style={{ position: "relative" }}>
              {i < 3 && (
                <div style={{
                  position: "absolute", top: 14, right: 14, zIndex: 2,
                  fontFamily: "var(--mono)", fontSize: 11, letterSpacing: "0.06em",
                  color: "var(--accent)", background: "var(--accent-wash)", padding: "3px 8px", borderRadius: 4,
                }}>
                  #{i + 1}
                </div>
              )}
              <PoemCard poem={p} onOpen={onOpen} onAuthor={onAuthor}/>
            </div>
          ))}
          {sorted.length === 0 && <p style={V.empty}>Nenhum poema ainda.</p>}
        </div>
      )}
    </main>
  );
}

function Seguidos({ onOpen, onAuthor }) {
  const { user, openAuth } = useAuthCtx();
  const { posts } = useDataCtx();
  useStore(followStore);
  useStore(likeStore);
  useEffect(() => { window.scrollTo(0, 0); }, []);

  if (!user) return (
    <main className="view-enter" style={V.page}>
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        <div style={{ color: "var(--accent)", marginBottom: 18 }}><Icon name="users" size={52} stroke={1.2}/></div>
        <h1 style={V.h1}>Seus seguidos</h1>
        <p style={{ ...V.heroSub, margin: "12px auto 24px", maxWidth: 380 }}>
          Entre ou crie uma conta para seguir autores e acompanhar suas novas publicações.
        </p>
        <button onClick={() => openAuth("Entre para ver os poemas de quem você segue.")} style={{ ...V.heroCta, display: "inline-flex" }}>
          <Icon name="user" size={16}/><span>Entrar</span>
        </button>
      </div>
    </main>
  );

  const followingIds = Object.keys(followStore.data[user.id] || {}).map(Number);
  const poems = useMemo(
    () => posts
      .filter(p => followingIds.includes(p.authorId))
      .sort((a, b) => b.id - a.id),
    [posts, followingIds.join(",")]
  );

  return (
    <main className="view-enter" style={V.page}>
      <div style={{ marginBottom: 36 }}>
        <span className="kicker">Publicações de quem você segue</span>
        <h1 style={{ ...V.h2, marginTop: 6, fontSize: "calc(36px * var(--type-scale))" }}>Seguidos</h1>
      </div>
      {followingIds.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={V.empty}>Você ainda não segue nenhum autor.</p>
          <p style={{ fontFamily: "var(--serif)", fontSize: "calc(17px * var(--type-scale))", color: "var(--ink-faint)", margin: 0 }}>
            Visite o perfil de um poeta e clique em <strong>Seguir</strong>.
          </p>
        </div>
      ) : poems.length === 0 ? (
        <p style={V.empty}>Os autores que você segue ainda não publicaram nenhum poema.</p>
      ) : (
        <div style={V.grid}>
          {poems.map(p => <PoemCard key={p.id} poem={p} onOpen={onOpen} onAuthor={onAuthor}/>)}
        </div>
      )}
    </main>
  );
}

function PoemView({ poem, onOpen, onAuthor, onBack }) {
  const { posts, users } = useDataCtx();
  const author = useMemo(() => users.find(u => u.id === poem.authorId) || { id: poem.authorId, nome: "Autor", name: "Autor", accent: 200 }, [users, poem.authorId]);
  const siblings = useMemo(() => poemsByAuthor(posts, author.id, poem).slice(0, 2), [posts, author.id, poem]);
  const idx = posts.findIndex(p => p.id === poem.id);
  const prev = posts[(idx - 1 + posts.length) % Math.max(posts.length, 1)];
  const next = posts[(idx + 1) % Math.max(posts.length, 1)];
  useEffect(() => { window.scrollTo(0, 0); }, [poem.id]);
  return (
    <main className="view-enter" style={V.readPage}>
      <button onClick={onBack} style={V.backLink}><Icon name="arrowLeft" size={16}/><span>Acervo</span></button>
      <article style={V.reader}>
        {poem.date && <div style={V.readMeta}><span className="meta">{fmtDate(poem.date)}</span></div>}
        <h1 style={V.readTitle}>{poem.title}</h1>
        <button onClick={() => onAuthor(author)} style={V.readByline}>
          <Avatar user={author} size={40}/>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.3 }}>
            <span style={{ fontFamily: "var(--serif)", fontSize: 16, fontWeight: 500, color: "var(--ink)" }}>{author.name || author.nome}</span>
            {author.city && <span className="meta">{author.city}</span>}
          </span>
        </button>
        <div style={V.poemBody} className="ruled">
          {poem.body.map((l, i) => <div key={i} style={{ minHeight: "calc(1.6em * var(--type-scale))" }}>{l || " "}</div>)}
        </div>
        <div style={V.readActions}>
          <LikeButton poem={poem} big/>
          <FavButton poem={poem} big/>
          <button style={V.shareBtn} onClick={() => { if (navigator.share) navigator.share({ title: poem.title, text: poem.body.join("\n") }).catch(()=>{}); }}>
            <Icon name="share" size={16}/><span>Compartilhar</span>
          </button>
        </div>
        <CommentSection poem={poem}/>
      </article>
      {siblings.length > 0 && (
        <section style={V.moreFrom}>
          <hr className="rule" style={{ marginBottom: 28 }}/>
          <div style={V.sectionHead}>
            <span className="kicker">Mais de {author.name || author.nome}</span>
            <button onClick={() => onAuthor(author)} style={V.textLink}>ver perfil →</button>
          </div>
          <div style={V.grid}>{siblings.map(p => <PoemCard key={p.id} poem={p} onOpen={onOpen} onAuthor={onAuthor}/>)}</div>
        </section>
      )}
      {posts.length > 1 && (
        <nav style={V.pager}>
          {prev && prev.id !== poem.id && (
            <button onClick={() => onOpen(prev)} style={{ ...V.pagerBtn, textAlign: "left" }}>
              <span className="meta" style={{ display: "flex", alignItems: "center", gap: 6 }}><Icon name="arrowLeft" size={13}/> anterior</span>
              <span style={V.pagerTitle}>{prev.title}</span>
            </button>
          )}
          {next && next.id !== poem.id && (
            <button onClick={() => onOpen(next)} style={{ ...V.pagerBtn, textAlign: "right", alignItems: "flex-end", marginLeft: "auto" }}>
              <span className="meta" style={{ display: "flex", alignItems: "center", gap: 6 }}>próximo <Icon name="arrowRight" size={13}/></span>
              <span style={V.pagerTitle}>{next.title}</span>
            </button>
          )}
        </nav>
      )}
    </main>
  );
}

function AuthorView({ author, onOpen, onAuthor, onBack }) {
  const { posts } = useDataCtx();
  const poems = useMemo(() => poemsByAuthor(posts, author.id), [posts, author.id]);
  const [, followers] = useFollowState(author.id);
  useStore(likeStore);
  const totalLikes = useMemo(() => poems.reduce((s, p) => s + likeStore.count(p.id), 0), [poems]);
  useEffect(() => { window.scrollTo(0, 0); }, [author.id]);
  return (
    <main className="view-enter" style={V.page}>
      <button onClick={onBack} style={V.backLink}><Icon name="arrowLeft" size={16}/><span>Voltar</span></button>
      <header style={V.profileHead}>
        <Avatar user={author} size={92}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="kicker">Autor · desde {author.joined}</span>
          <h1 style={V.profileName}>{author.name || author.nome}</h1>
          {author.bio && <p style={V.profileBio}>{author.bio}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginTop: author.bio ? 0 : 8 }}>
            <div style={V.profileStats}>
              {author.city && <><span className="meta">{author.city}</span><span style={V.dot}/></>}
              <span className="meta">{poems.length} poemas</span>
              <span style={V.dot}/>
              <span className="meta">{totalLikes} curtidas</span>
              <span style={V.dot}/>
              <span className="meta">{followers} seguidores</span>
            </div>
            <FollowButton authorId={author.id}/>
          </div>
        </div>
      </header>
      <hr className="rule" style={{ margin: "0 0 36px" }}/>
      <h2 style={{ ...V.h2, marginBottom: 24 }}>Poemas</h2>
      {poems.length === 0
        ? <p style={V.empty}>Nenhum poema publicado ainda.</p>
        : <div style={V.grid}>{poems.map(p => <PoemCard key={p.id} poem={p} onOpen={onOpen} onAuthor={onAuthor}/>)}</div>
      }
    </main>
  );
}

function MyProfile({ onOpen, onAuthor, onBack, onPublish }) {
  const { user } = useAuthCtx();
  const { posts } = useDataCtx();
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState(user?.bio || "");
  const [city, setCity] = useState(user?.city || "");
  useEffect(() => { setBio(user?.bio || ""); setCity(user?.city || ""); }, [user?.id]);
  useEffect(() => { window.scrollTo(0, 0); }, []);
  if (!user) return null;
  const poems = useMemo(() => poemsByAuthor(posts, user.id), [posts, user.id]);
  useStore(likeStore);
  const totalLikes = useMemo(() => poems.reduce((s, p) => s + likeStore.count(p.id), 0), [poems]);
  const followers  = followStore.followerCount(user.id);
  const following  = followStore.followingCount(user.id);

  const saveBio = () => {
    authStore.updateProfile({ bio, city });
    setEditingBio(false);
  };

  return (
    <main className="view-enter" style={V.page}>
      <button onClick={onBack} style={V.backLink}><Icon name="arrowLeft" size={16}/><span>Voltar</span></button>
      <header style={V.profileHead}>
        <Avatar user={user} size={92}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="kicker">Meu perfil</span>
          <h1 style={V.profileName}>{user.nome}</h1>
          {editingBio ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 460, marginBottom: 14 }}>
              <input value={city} onChange={e => setCity(e.target.value)} placeholder="Cidade, UF"
                style={{ ...V.commentInput, fontSize: 14, padding: "8px 12px" }}/>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="Sua bio…"
                style={{ ...V.commentInput, resize: "vertical" }}/>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={saveBio} style={{ ...V.commentSubmit, padding: "7px 18px" }}>Salvar</button>
                <button onClick={() => setEditingBio(false)}
                  style={{ background: "none", border: 0, fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-faint)", padding: "7px 0" }}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <p style={{ ...V.profileBio, cursor: "pointer" }} onClick={() => setEditingBio(true)}>
              {user.bio || <em style={{ color: "var(--ink-faint)" }}>Adicione uma bio →</em>}
            </p>
          )}
          <div style={V.profileStats}>
            {user.city && <><span className="meta">{user.city}</span><span style={V.dot}/></>}
            <span className="meta">{poems.length} poemas</span>
            <span style={V.dot}/>
            <span className="meta">{totalLikes} curtidas</span>
            <span style={V.dot}/>
            <span className="meta">{followers} seguidores</span>
            <span style={V.dot}/>
            <span className="meta">seguindo {following}</span>
            {!editingBio && (
              <button onClick={() => setEditingBio(true)}
                style={{ background: "none", border: 0, display: "inline-flex", alignItems: "center", gap: 5,
                  fontFamily: "var(--mono)", fontSize: 11.5, color: "var(--accent)", padding: 0, marginLeft: 4 }}>
                <Icon name="edit" size={13}/> Editar
              </button>
            )}
          </div>
        </div>
      </header>
      <hr className="rule" style={{ margin: "0 0 36px" }}/>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={V.h2}>Meus Poemas</h2>
        <button onClick={onPublish} style={A.publishBtn}><Icon name="plus" size={14}/><span>Novo poema</span></button>
      </div>
      {poems.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <p style={V.empty}>Você ainda não publicou nenhum poema.</p>
          <button onClick={onPublish} style={{ ...V.heroCta, marginTop: 16, display: "inline-flex" }}>
            <Icon name="quote" size={15}/><span>Publicar meu primeiro poema</span>
          </button>
        </div>
      ) : (
        <div style={V.grid}>{poems.map(p => <PoemCard key={p.id} poem={p} onOpen={onOpen} onAuthor={onAuthor}/>)}</div>
      )}
    </main>
  );
}

function SearchOverlay({ onClose, onOpen, onAuthor }) {
  const { posts, users } = useDataCtx();
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current && inputRef.current.focus();
    const esc = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, []);

  const term = q.trim().toLowerCase();
  const poemResults = term
    ? posts.filter(p => {
        const a = users.find(u => u.id === p.authorId);
        const aName = (a?.nome || "").toLowerCase();
        return p.title.toLowerCase().includes(term) || aName.includes(term) || p.body.join(" ").toLowerCase().includes(term);
      })
    : posts.slice(0, 5);
  const authorResults = term
    ? users.filter(u => u.nome.toLowerCase().includes(term) || u.city.toLowerCase().includes(term))
    : [];

  return (
    <div style={V.searchScrim} onMouseDown={onClose}>
      <div style={V.searchPanel} onMouseDown={e => e.stopPropagation()}>
        <div style={V.searchBar}>
          <Icon name="search" size={20}/>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar por verso, título ou autor…" style={V.searchInput}/>
          <button onClick={onClose} style={A.iconBtn}><Icon name="close"/></button>
        </div>
        <div style={V.searchResults}>
          {authorResults.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <span className="kicker" style={{ display: "block", marginBottom: 10 }}>Autores</span>
              {authorResults.map(a => (
                <button key={a.id} onClick={() => { onAuthor(a); onClose(); }} style={V.searchAuthor}>
                  <Avatar user={a} size={34}/>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 16 }}>{a.nome}</span>
                  {a.city && <span className="meta" style={{ marginLeft: "auto" }}>{a.city}</span>}
                </button>
              ))}
            </div>
          )}
          <span className="kicker" style={{ display: "block", marginBottom: 10 }}>
            {term ? `${poemResults.length} poema${poemResults.length === 1 ? "" : "s"}` : "Sugestões"}
          </span>
          {poemResults.map(p => {
            const a = users.find(u => u.id === p.authorId);
            return (
              <button key={p.id} onClick={() => { onOpen(p); onClose(); }} style={V.searchPoemRow}>
                <span style={V.searchPoemMain}>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 17, color: "var(--ink)" }}>{p.title}</span>
                  <span className="meta">{a?.nome || "Autor"}</span>
                </span>
                <Icon name="arrowRight" size={15}/>
              </button>
            );
          })}
          {term && poemResults.length === 0 && authorResults.length === 0 && (
            <p style={V.empty}>Nada encontrado para "{q}".</p>
          )}
        </div>
      </div>
    </div>
  );
}

function PublishView({ onBack, onDone }) {
  const { user } = useAuthCtx();
  const { reload } = useDataCtx();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [allowComments, setAllowComments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");
  const [publishedTitle, setPublishedTitle] = useState("");
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const submit = async () => {
    if (!title.trim() || !text.trim() || !user) return;
    setSubmitting(true); setErr("");
    try {
      const raw = await api.posts.create({
        id_post: 0, id_user_post: user.id,
        txt_title: title.trim(), txt_post: text,
        ic_comment: allowComments, created_at: "",
      });
      await reload();
      setPublishedTitle(title.trim());
    } catch {
      setErr("Não foi possível publicar. Verifique a conexão com o servidor.");
      setSubmitting(false);
    }
  };

  if (publishedTitle) return (
    <main className="view-enter" style={{ ...V.page, textAlign: "center", paddingTop: 80 }}>
      <div style={{ color: "var(--accent)", marginBottom: 18 }}><Icon name="check" size={52} stroke={1.2}/></div>
      <h1 style={V.h1}>Publicado!</h1>
      <p style={V.heroSub}>"{publishedTitle}" já está no acervo.</p>
      <button onClick={onBack} style={{ ...V.heroCta, marginTop: 24, display: "inline-flex" }}>Ver no acervo</button>
    </main>
  );

  const lines = text.split("\n");
  return (
    <main className="view-enter" style={V.page}>
      <button onClick={onBack} style={V.backLink}><Icon name="arrowLeft" size={16}/><span>Acervo</span></button>
      <div style={V.publishHead}>
        <span className="kicker">Novo poema</span>
        <h1 style={V.h1}>Escreva entre as rimas</h1>
      </div>
      <div style={V.publishGrid}>
        <div style={V.editor}>
          <label style={A.label}>Título</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Sem título" style={V.fieldTitle}/>
          <label style={{ ...A.label, marginTop: 26 }}>Versos</label>
          <textarea value={text} onChange={e => setText(e.target.value)}
            placeholder={"Escreva um verso por linha…\nA quebra de linha é sua pausa."} style={V.fieldBody} rows={12}/>
          <label style={{
            display: "flex", alignItems: "center", gap: 10, marginTop: 16, cursor: "pointer",
            fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-faint)",
          }}>
            <input type="checkbox" checked={allowComments} onChange={e => setAllowComments(e.target.checked)}
              style={{ width: 15, height: 15, accentColor: "var(--accent)" }}/>
            Permitir comentários
          </label>
          {err && <p style={{ ...A.authErr, textAlign: "left", marginTop: 8 }}>{err}</p>}
          <div style={V.publishActions}>
            <span className="meta">{lines.filter(l => l.trim()).length} versos</span>
            <button style={V.publishBtn} disabled={!title || !text || submitting} onClick={submit}>
              {submitting ? <Spinner size={14}/> : "Publicar"}
            </button>
          </div>
        </div>
        <div style={V.preview}>
          <span className="kicker" style={{ marginBottom: 18, display: "block" }}>Pré-visualização</span>
          <div style={V.previewCard}>
            <div style={V.readMeta}><span className="meta">{fmtDate(new Date().toISOString().slice(0, 10))}</span></div>
            <h2 style={{ ...V.readTitle, fontSize: "calc(34px * var(--type-scale))" }}>{title || "Sem título"}</h2>
            <div style={V.readByline}>
              <Avatar user={user} size={34}/>
              <span style={{ fontFamily: "var(--serif)", fontSize: 15, fontWeight: 500 }}>{user.nome}</span>
            </div>
            <div style={{ ...V.poemBody, fontSize: "calc(19px * var(--type-scale))" }} className="ruled">
              {(text ? lines : ["Seus versos aparecem aqui,", "em tempo real,", "enquanto você escreve."]).map((l, i) => (
                <div key={i} style={{ minHeight: "calc(1.6em * var(--type-scale))", color: text ? "var(--ink)" : "var(--ink-faint)" }}>{l || " "}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

const A = {
  logo:          { display: "flex", alignItems: "center", gap: 11, background: "none", border: 0, padding: 0 },
  logoMark:      { display: "flex", flexDirection: "column", gap: 3, width: 22, flex: "none" },
  logoLine:      { height: 1.5, background: "var(--ink)", borderRadius: 2, width: "100%" },
  logoText:      { fontFamily: "var(--serif)", fontSize: 21, fontWeight: 500, letterSpacing: "-0.01em", color: "var(--ink)" },

  header:        { position: "sticky", top: 0, zIndex: 50,
    background: "color-mix(in oklab, var(--bg) 82%, transparent)",
    backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
    borderBottom: "1px solid transparent", transition: "border-color .3s var(--ease)" },
  headerScrolled:{ borderBottom: "1px solid var(--rule)" },
  headerInner:   { maxWidth: "var(--maxw)", margin: "0 auto", padding: "16px 32px",
    display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 20 },
  nav:           { display: "flex", gap: 6, justifyContent: "center" },
  navItem:       { background: "none", border: 0, fontFamily: "var(--serif)", fontSize: 16, color: "var(--ink-soft)",
    padding: "7px 14px", borderRadius: 999, transition: "color .2s,background .2s" },
  navItemActive: { color: "var(--ink)", background: "var(--bg-2)" },
  headerRight:   { display: "flex", alignItems: "center", gap: 6, justifySelf: "end" },
  iconBtn:       { background: "none", border: 0, color: "var(--ink-soft)", width: 38, height: 38, borderRadius: 999,
    display: "grid", placeItems: "center", transition: "color .2s" },
  publishBtn:    { display: "flex", alignItems: "center", gap: 7, marginLeft: 4, background: "var(--ink)", color: "var(--bg)",
    border: 0, padding: "9px 16px 9px 13px", borderRadius: 999, fontFamily: "var(--serif)", fontSize: 15, fontWeight: 500 },
  followingBtn:  { background: "var(--bg-2)", color: "var(--ink)", border: "1px solid var(--rule)" },

  avatarBtn:     { background: "none", border: 0, cursor: "pointer", padding: 0, borderRadius: "50%", display: "flex", alignItems: "center" },
  dropdown:      { position: "absolute", top: "calc(100% + 10px)", right: 0, minWidth: 210,
    background: "var(--surface)", border: "1px solid var(--rule)", borderRadius: 8,
    boxShadow: "var(--shadow)", zIndex: 100, overflow: "hidden" },
  dropHeader:    { padding: "12px 16px", display: "flex", flexDirection: "column", gap: 3 },
  dropItem:      { display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: 0,
    padding: "10px 16px", fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink)",
    transition: "background .15s", textAlign: "left", cursor: "pointer" },

  chip:          { background: "none", border: "1px solid var(--rule)", color: "var(--ink-soft)",
    fontFamily: "var(--mono)", fontSize: 12.5, letterSpacing: "0.02em", padding: "7px 14px", borderRadius: 999, cursor: "pointer" },
  chipActive:    { background: "var(--ink)", color: "var(--bg)", borderColor: "var(--ink)" },

  likeBtn:       { display: "flex", alignItems: "center", gap: 7, background: "none", border: 0, padding: "4px 2px", cursor: "pointer" },
  likeBtnBig:    { gap: 9 },

  card:          { display: "flex", flexDirection: "column", gap: 14, padding: "26px 26px 22px",
    background: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius)",
    transition: "transform .4s var(--ease),box-shadow .4s var(--ease),border-color .3s" },
  cardFeatured:  { padding: "38px 40px 30px" },
  cardHover:     { transform: "translateY(-3px)", boxShadow: "var(--shadow)",
    borderColor: "color-mix(in oklab, var(--accent) 40%, var(--rule))" },
  cardTop:       { display: "flex", justifyContent: "flex-end" },
  cardTitleBtn:  { display: "block", background: "none", border: 0, padding: 0, textAlign: "left", width: "100%", cursor: "pointer" },
  cardTitle:     { fontFamily: "var(--serif)", fontSize: "calc(25px * var(--type-scale))", fontWeight: 500, lineHeight: 1.15,
    margin: 0, color: "var(--ink)", letterSpacing: "-0.01em" },
  cardTitleFeatured: { fontSize: "calc(40px * var(--type-scale))", fontWeight: 400 },
  cardExcerpt:   { fontFamily: "var(--serif)", fontSize: "calc(17px * var(--type-scale))", color: "var(--ink-soft)",
    lineHeight: 1.6, cursor: "pointer", position: "relative" },
  contLink:      { display: "block", marginTop: 8, fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.04em",
    color: "var(--accent)", transition: "opacity .3s" },
  cardFoot:      { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4,
    paddingTop: 16, borderTop: "1px solid var(--rule-soft)" },
  cardActions:   { display: "flex", alignItems: "center", gap: 16 },
  byline:        { display: "flex", alignItems: "center", gap: 10, background: "none", border: 0, padding: 0, cursor: "pointer" },
  bylineName:    { fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink)", fontWeight: 500 },

  scrim:         { position: "fixed", inset: 0, zIndex: 100,
    background: "color-mix(in oklab, var(--bg) 55%, transparent)",
    backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
    display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "8vh 24px 24px" },
  authCard:      { position: "relative", background: "var(--surface)", border: "1px solid var(--rule)",
    borderRadius: 12, boxShadow: "var(--shadow)", padding: "32px 36px 36px", width: "100%", maxWidth: 420 },
  authTabs:      { display: "flex", gap: 4, marginBottom: 24, background: "var(--bg-2)", borderRadius: 999, padding: "4px" },
  authTab:       { flex: 1, background: "none", border: 0, padding: "9px 0", borderRadius: 999,
    fontFamily: "var(--serif)", fontSize: 15, color: "var(--ink-soft)", transition: "all .2s", cursor: "pointer" },
  authTabActive: { background: "var(--surface)", color: "var(--ink)", boxShadow: "0 1px 4px oklch(0 0 0 / 0.12)" },
  authField:     { display: "block", width: "100%", background: "var(--bg)", border: "1px solid var(--rule)",
    borderRadius: "var(--radius)", padding: "11px 14px", fontFamily: "var(--serif)", fontSize: 16,
    color: "var(--ink)", outline: "none", boxSizing: "border-box", marginTop: 6 },
  authSubmit:    { display: "flex", justifyContent: "center", alignItems: "center", width: "100%", background: "var(--ink)", color: "var(--bg)", border: 0,
    padding: "13px 0", borderRadius: 999, fontFamily: "var(--serif)", fontSize: 16, fontWeight: 500,
    marginTop: 4, cursor: "pointer" },
  authErr:       { fontFamily: "var(--mono)", fontSize: 12.5, color: "oklch(0.58 0.16 24)", margin: 0, textAlign: "center" },
  authReason:    { fontFamily: "var(--serif)", fontStyle: "italic", fontSize: 15, color: "var(--ink-soft)",
    textAlign: "center", margin: "0 0 18px", lineHeight: 1.5 },

  label:         { fontFamily: "var(--mono)", fontSize: 11.5, letterSpacing: "0.12em", textTransform: "uppercase",
    color: "var(--ink-faint)", display: "block", marginBottom: 2 },
};

const V = {
  page:          { maxWidth: "var(--maxw)", margin: "0 auto", padding: "40px 32px 120px" },
  readPage:      { maxWidth: 860, margin: "0 auto", padding: "24px 32px 120px" },

  hero:          { display: "grid", gridTemplateColumns: "1.45fr 1fr", gap: 48, alignItems: "center", padding: "46px 0 56px" },
  heroText:      { display: "flex", flexDirection: "column", gap: 22, alignItems: "flex-start" },
  heroTitle:     { fontFamily: "var(--serif)", fontSize: "calc(52px * var(--type-scale))", fontWeight: 400, lineHeight: 1.08,
    margin: 0, letterSpacing: "-0.02em", color: "var(--ink)", textWrap: "balance" },
  heroSub:       { fontFamily: "var(--serif)", fontSize: "calc(19px * var(--type-scale))", color: "var(--ink-soft)",
    lineHeight: 1.55, margin: 0, maxWidth: 460 },
  heroStats:     { display: "flex", alignItems: "center", gap: 20, marginTop: 6, flexWrap: "wrap" },
  heroCta:       { display: "flex", alignItems: "center", gap: 9, background: "var(--accent)", color: "#fff",
    border: 0, padding: "12px 22px", borderRadius: 999, fontFamily: "var(--serif)", fontSize: 16.5, fontWeight: 500, cursor: "pointer" },
  heroRule:      { display: "flex", flexDirection: "column", gap: 18, alignItems: "flex-end", paddingLeft: 20 },
  heroRuleLine:  { height: 2, background: "var(--ink)", borderRadius: 2, display: "block" },

  sectionHead:   { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 },
  acervoHead:    { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, marginBottom: 24, flexWrap: "wrap" },
  h1:            { fontFamily: "var(--serif)", fontSize: "calc(44px * var(--type-scale))", fontWeight: 400, margin: "6px 0 0", letterSpacing: "-0.02em", color: "var(--ink)" },
  h2:            { fontFamily: "var(--serif)", fontSize: "calc(30px * var(--type-scale))", fontWeight: 500, margin: 0, letterSpacing: "-0.01em", color: "var(--ink)" },
  chips:         { display: "flex", gap: 9, flexWrap: "wrap" },
  grid:          { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 22 },
  empty:         { fontFamily: "var(--serif)", fontStyle: "italic", color: "var(--ink-faint)", padding: "30px 0" },

  backLink:      { display: "inline-flex", alignItems: "center", gap: 7, background: "none", border: 0,
    fontFamily: "var(--mono)", fontSize: 12.5, letterSpacing: "0.04em", textTransform: "uppercase",
    color: "var(--ink-faint)", padding: "6px 0", marginBottom: 26, cursor: "pointer" },

  reader:        { maxWidth: "var(--read)", margin: "0 auto" },
  readMeta:      { display: "flex", justifyContent: "flex-end", marginBottom: 14 },
  readTitle:     { fontFamily: "var(--serif)", fontSize: "calc(46px * var(--type-scale))", fontWeight: 400, lineHeight: 1.1,
    margin: "0 0 22px", letterSpacing: "-0.02em", color: "var(--ink)", textWrap: "balance" },
  readByline:    { display: "flex", alignItems: "center", gap: 12, background: "none", border: 0, padding: 0,
    marginBottom: 36, width: "fit-content", cursor: "pointer" },
  poemBody:      { fontFamily: "var(--serif)", fontSize: "calc(21px * var(--type-scale))",
    lineHeight: "calc(1.6em * var(--type-scale))", color: "var(--ink)", padding: "8px 0",
    fontWeight: 400, backgroundPositionY: "0.5em" },
  readActions:   { display: "flex", alignItems: "center", gap: 22, marginTop: 40, paddingTop: 24, borderTop: "1px solid var(--rule)" },
  shareBtn:      { display: "flex", alignItems: "center", gap: 8, background: "none", border: "1px solid var(--rule)",
    color: "var(--ink-soft)", padding: "8px 16px", borderRadius: 999, fontFamily: "var(--serif)", fontSize: 14.5, cursor: "pointer" },

  comments:      { marginTop: 44, maxWidth: "var(--read)", margin: "44px auto 0" },
  composer:      { display: "flex", gap: 14, marginBottom: 24 },
  commentInput:  { width: "100%", background: "var(--surface)", border: "1px solid var(--rule)",
    borderRadius: "var(--radius)", padding: "12px 14px", fontFamily: "var(--serif)", fontSize: 16.5,
    lineHeight: 1.5, color: "var(--ink)", outline: "none", resize: "vertical", boxSizing: "border-box" },
  commentSubmit: { background: "var(--ink)", color: "var(--bg)", border: 0, padding: "8px 20px",
    borderRadius: 999, fontFamily: "var(--serif)", fontSize: 15, fontWeight: 500, cursor: "pointer" },
  commentList:   { display: "flex", flexDirection: "column", gap: 24, marginTop: 16 },
  commentItem:   { display: "flex", gap: 14, alignItems: "flex-start" },
  commentHead:   { display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4, flexWrap: "wrap" },
  commentName:   { fontFamily: "var(--serif)", fontSize: 15.5, fontWeight: 500, color: "var(--ink)",
    display: "inline-flex", alignItems: "center", gap: 8 },
  youTag:        { fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
    color: "var(--accent)", border: "1px solid var(--accent-wash)", background: "var(--accent-wash)",
    padding: "1px 6px", borderRadius: 4 },
  commentText:   { fontFamily: "var(--serif)", fontSize: 17, lineHeight: 1.55, color: "var(--ink-soft)", margin: 0 },
  authPrompt:    { display: "flex", alignItems: "center", gap: 10, background: "var(--bg-2)",
    border: "1px dashed var(--rule)", borderRadius: 8, padding: "14px 20px", width: "100%",
    fontFamily: "var(--serif)", fontSize: 16, color: "var(--ink-soft)", marginBottom: 20, cursor: "pointer" },

  moreFrom:      { maxWidth: "var(--maxw)", margin: "70px auto 0" },
  textLink:      { background: "none", border: 0, fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.04em",
    color: "var(--accent)", padding: 0, cursor: "pointer" },
  pager:         { display: "flex", gap: 18, marginTop: 60, maxWidth: "var(--read)", marginInline: "auto" },
  pagerBtn:      { display: "flex", flexDirection: "column", gap: 5, background: "none", border: "1px solid var(--rule)",
    borderRadius: "var(--radius)", padding: "16px 18px", cursor: "pointer" },
  pagerTitle:    { fontFamily: "var(--serif)", fontSize: 17, color: "var(--ink)", fontWeight: 500 },

  profileHead:   { display: "flex", gap: 28, alignItems: "flex-start", marginBottom: 36, flexWrap: "wrap" },
  profileName:   { fontFamily: "var(--serif)", fontSize: "calc(40px * var(--type-scale))", fontWeight: 400,
    margin: "4px 0 12px", letterSpacing: "-0.02em", color: "var(--ink)" },
  profileBio:    { fontFamily: "var(--serif)", fontSize: "calc(18px * var(--type-scale))", fontStyle: "italic",
    color: "var(--ink-soft)", lineHeight: 1.5, margin: "0 0 16px", maxWidth: 560 },
  profileStats:  { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  dot:           { width: 3, height: 3, borderRadius: "50%", background: "var(--ink-faint)", display: "inline-block" },

  searchScrim:   { position: "fixed", inset: 0, zIndex: 100,
    background: "color-mix(in oklab, var(--bg) 55%, transparent)",
    backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
    display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "12vh 24px 24px" },
  searchPanel:   { width: "100%", maxWidth: 640, background: "var(--surface)", border: "1px solid var(--rule)",
    borderRadius: 8, boxShadow: "var(--shadow)", overflow: "hidden", maxHeight: "74vh", display: "flex", flexDirection: "column" },
  searchBar:     { display: "flex", alignItems: "center", gap: 12, padding: "16px 16px 16px 20px",
    borderBottom: "1px solid var(--rule)", color: "var(--ink-faint)" },
  searchInput:   { flex: 1, background: "none", border: 0, outline: "none", fontFamily: "var(--serif)", fontSize: 19, color: "var(--ink)" },
  searchResults: { padding: "18px 14px", overflowY: "auto" },
  searchPoemRow: { display: "flex", alignItems: "center", gap: 14, width: "100%", background: "none", border: 0,
    padding: "12px 14px", borderRadius: 6, color: "var(--ink-faint)", cursor: "pointer" },
  searchPoemMain:{ display: "flex", flexDirection: "column", gap: 3, alignItems: "flex-start", flex: 1, minWidth: 0 },
  searchAuthor:  { display: "flex", alignItems: "center", gap: 12, width: "100%", background: "none", border: 0,
    padding: "9px 14px", borderRadius: 6, color: "var(--ink)", cursor: "pointer" },

  publishHead:   { marginBottom: 30 },
  publishGrid:   { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "start" },
  editor:        { display: "flex", flexDirection: "column", gap: 10 },
  fieldTitle:    { background: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius)",
    padding: "12px 14px", fontFamily: "var(--serif)", fontSize: 22, color: "var(--ink)",
    outline: "none", marginBottom: 22, boxSizing: "border-box", width: "100%" },
  fieldBody:     { background: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius)",
    padding: "16px", fontFamily: "var(--serif)", fontSize: 18, lineHeight: 1.6, color: "var(--ink)",
    outline: "none", resize: "vertical", marginTop: 8, boxSizing: "border-box", width: "100%" },
  publishActions:{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, gap: 16 },
  publishBtn:    { background: "var(--ink)", color: "var(--bg)", border: 0, padding: "11px 24px",
    borderRadius: 999, fontFamily: "var(--serif)", fontSize: 16, fontWeight: 500, cursor: "pointer",
    display: "flex", alignItems: "center", gap: 8 },
  preview:       { position: "sticky", top: 90 },
  previewCard:   { background: "var(--bg-2)", border: "1px solid var(--rule)", borderRadius: 8, padding: "32px 32px 36px" },
};

function Footer({ onPublish }) {
  const { user, openAuth } = useAuthCtx();
  return (
    <footer style={{ borderTop: "1px solid var(--rule)", marginTop: 40 }}>
      <div style={{ maxWidth: "var(--maxw)", margin: "0 auto", padding: "40px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Logo/>
          <span className="meta" style={{ maxWidth: 320 }}>Poesia compartilhada. Feito para quem escreve devagar.</span>
        </div>
        <button onClick={user ? onPublish : () => openAuth("Crie uma conta para publicar.")}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "1px solid var(--rule)",
            color: "var(--ink)", padding: "10px 18px", borderRadius: 999, fontFamily: "var(--serif)", fontSize: 15, cursor: "pointer" }}>
          <Icon name="quote" size={15}/> Publicar um poema
        </button>
      </div>
    </footer>
  );
}

const ACCENTS = [
  { key: "terracota", hue: 46,  swatch: "oklch(0.585 0.11 46)"  },
  { key: "ardósia",   hue: 250, swatch: "oklch(0.585 0.10 250)" },
  { key: "musgo",     hue: 150, swatch: "oklch(0.560 0.09 150)" },
  { key: "ameixa",    hue: 332, swatch: "oklch(0.560 0.10 332)" },
];
const SERIFS = { "Newsreader": '"Newsreader", Georgia, serif', "Spectral": '"Spectral", Georgia, serif' };
const TWEAK_DEFAULTS = { dark: false, accent: 46, typeScale: 1, serif: "Newsreader" };

function applyTheme(t) {
  const r = document.documentElement;
  r.setAttribute("data-theme", t.dark ? "dark" : "light");
  const H = t.accent;
  if (t.dark) {
    r.style.setProperty("--accent",       `oklch(0.715 0.105 ${H})`);
    r.style.setProperty("--accent-ink",   `oklch(0.80 0.09 ${H})`);
    r.style.setProperty("--accent-wash",  `oklch(0.715 0.105 ${H} / 0.14)`);
  } else {
    r.style.setProperty("--accent",       `oklch(0.585 0.11 ${H})`);
    r.style.setProperty("--accent-ink",   `oklch(0.43 0.11 ${H})`);
    r.style.setProperty("--accent-wash",  `oklch(0.585 0.11 ${H} / 0.10)`);
  }
  r.style.setProperty("--type-scale", t.typeScale);
  r.style.setProperty("--serif", SERIFS[t.serif] || SERIFS.Newsreader);
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = useState({ name: "home" });
  const [filter, setFilter] = useState("Todos");
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState("");
  const authUser = useAuthUser();

  const [appState, setAppState] = useState({ users: [], posts: [], loading: true, apiOk: true });

  const loadData = useCallback(async () => {
    setAppState(prev => ({ ...prev, loading: true }));
    try {
      const [rawUsers, rawPosts] = await Promise.all([api.users.getAll(), api.posts.getAll()]);
      const users = rawUsers.map(adaptUser);
      const posts = rawPosts.map(adaptPost).sort((a, b) => b.id - a.id);
      setAppState({ users, posts, loading: false, apiOk: true });
    } catch {
      setAppState(prev => ({ ...prev, loading: false, apiOk: false }));
    }
  }, []);

  useEffect(() => { loadData(); }, []);
  useEffect(() => { applyTheme(t); }, [t.dark, t.accent, t.typeScale, t.serif]);
  useEffect(() => {
    const h = e => {
      if (e.key === "/" && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        e.preventDefault(); setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const openAuth = (reason = "") => { setAuthReason(reason); setAuthOpen(true); };
  const logout   = () => { authStore.logout(); setRoute({ name: "home" }); };
  const nav      = (name, extra = {}) => { setRoute({ name, ...extra }); window.scrollTo(0, 0); };

  const goPublish = () => authUser ? nav("publish") : openAuth("Para publicar um poema, entre ou crie uma conta.");
  const goProfile = () => authUser ? nav("profile") : openAuth();

  const ctxValue = { user: authUser, openAuth, logout };
  const dataValue = { ...appState, reload: loadData };

  let content;
  if      (route.name === "home")     content = <Home filter={filter} setFilter={setFilter} onOpen={p => nav("poem", { poem: p })} onAuthor={a => nav("author", { author: a })} onPublish={goPublish}/>;
  else if (route.name === "explorar") content = <Explorar  onOpen={p => nav("poem", { poem: p })} onAuthor={a => nav("author", { author: a })}/>;
  else if (route.name === "seguidos") content = <Seguidos  onOpen={p => nav("poem", { poem: p })} onAuthor={a => nav("author", { author: a })}/>;
  else if (route.name === "poem")     content = <PoemView poem={route.poem} onOpen={p => nav("poem", { poem: p })} onAuthor={a => nav("author", { author: a })} onBack={() => nav("home")}/>;
  else if (route.name === "author")   content = <AuthorView author={route.author} onOpen={p => nav("poem", { poem: p })} onAuthor={a => nav("author", { author: a })} onBack={() => nav("home")}/>;
  else if (route.name === "profile")  content = <MyProfile onOpen={p => nav("poem", { poem: p })} onAuthor={a => nav("author", { author: a })} onBack={() => nav("home")} onPublish={goPublish}/>;
  else if (route.name === "publish")  content = <PublishView onBack={() => nav("home")}/>;

  return (
    <DataContext.Provider value={dataValue}>
      <AuthContext.Provider value={ctxValue}>
        <Header
          route={route.name} theme={t.dark ? "dark" : "light"}
          onHome={() => nav("home")} onExplorar={() => nav("explorar")} onSeguidos={() => nav("seguidos")}
          onSearch={() => setSearchOpen(true)} onPublish={goPublish} onProfile={goProfile}
          onToggleTheme={() => setTweak("dark", !t.dark)}
        />
        {content}
        <Footer onPublish={goPublish}/>
        {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} onOpen={p => nav("poem", { poem: p })} onAuthor={a => nav("author", { author: a })}/>}
        {authOpen && <AuthModal reason={authReason} onClose={() => setAuthOpen(false)}/>}
        <TweaksPanel>
          <TweakSection label="Tema"/>
          <TweakToggle label="Modo escuro" value={t.dark} onChange={v => setTweak("dark", v)}/>
          <TweakRow label="Acento">
            <div style={{ display: "flex", gap: 8 }}>
              {ACCENTS.map(ac => (
                <button key={ac.key} onClick={() => setTweak("accent", ac.hue)} title={ac.key} aria-label={ac.key}
                  style={{
                    width: 26, height: 26, borderRadius: "50%", background: ac.swatch, cursor: "pointer",
                    border: t.accent === ac.hue ? "2px solid var(--ink)" : "2px solid var(--rule)",
                    outline: t.accent === ac.hue ? "2px solid var(--bg)" : "none", outlineOffset: -4,
                    boxShadow: t.accent === ac.hue ? "0 0 0 2px var(--accent)" : "none", transition: "box-shadow .2s",
                  }}/>
              ))}
            </div>
          </TweakRow>
          <TweakSection label="Tipografia"/>
          <TweakRadio label="Serifa" value={t.serif} options={["Newsreader", "Spectral"]} onChange={v => setTweak("serif", v)}/>
          <TweakSlider label="Tamanho do texto" value={t.typeScale} min={0.9} max={1.18} step={0.02} onChange={v => setTweak("typeScale", v)}/>
        </TweaksPanel>
      </AuthContext.Provider>
    </DataContext.Provider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
