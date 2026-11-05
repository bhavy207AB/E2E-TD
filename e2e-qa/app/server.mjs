// A small but real web app under test for the TDV2-1133 e2e QA harness.
// No dependencies: a plain Node HTTP server with cookie auth, a login form,
// a dashboard, and an interactive todo list. Semantic HTML so the e2e
// framework's role/label locators resolve the way they would on a real app.
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 3000);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.test';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'secret123';
const SID = 'ok';

const page = (title, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 0; background: #f4f5f7; color: #172b4d; }
  main { max-width: 640px; margin: 0 auto; padding: 32px 24px; }
  h1 { font-size: 28px; margin: 0 0 24px; }
  label { display: block; font-weight: 600; margin: 16px 0 4px; }
  input { width: 100%; padding: 10px 12px; border: 1px solid #c1c7d0; border-radius: 6px; font-size: 16px; }
  button { margin-top: 20px; padding: 10px 18px; border: 0; border-radius: 6px; background: #0052cc; color: #fff; font-size: 16px; cursor: pointer; }
  nav { margin-top: 24px; display: flex; gap: 16px; }
  a { color: #0052cc; }
  [role=alert] { color: #bf2600; font-weight: 600; margin-top: 16px; }
  section[aria-label=Summary] { background: #fff; border: 1px solid #dfe1e6; border-radius: 8px; padding: 20px 24px; width: 320px; }
  section[aria-label=Summary] h2 { margin: 0 0 12px; font-size: 18px; }
  section[aria-label=Summary] dl { margin: 0; display: grid; grid-template-columns: 1fr auto; row-gap: 8px; }
  section[aria-label=Summary] dt { color: #5e6c84; }
  section[aria-label=Summary] dd { margin: 0; font-weight: 700; }
  ul { list-style: none; padding: 0; margin: 20px 0; }
  li { display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid #dfe1e6; border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; }
  li.done span { text-decoration: line-through; color: #97a0af; }
</style>
</head>
<body>${body}</body>
</html>`;

const loginPage = (error) => page('Sign in', `<main>
  <h1>Sign in</h1>
  <form method="POST" action="/login">
    <label for="email">Email</label>
    <input id="email" name="email" type="email" autocomplete="username">
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password">
    <button type="submit">Sign in</button>
  </form>
  ${error ? '<p role="alert">Invalid email or password</p>' : ''}
</main>`);

const dashboardPage = () => page('Dashboard', `<main>
  <h1>Dashboard</h1>
  <section aria-label="Summary">
    <h2>Workspace summary</h2>
    <dl>
      <dt>Projects</dt><dd>3</dd>
      <dt>Open tasks</dt><dd>12</dd>
      <dt>Members</dt><dd>5</dd>
    </dl>
  </section>
  <nav>
    <a href="/todos">Todos</a>
    <a href="/logout">Sign out</a>
  </nav>
</main>`);

const todosPage = () => page('Todos', `<main>
  <h1>Todos</h1>
  <form id="new">
    <label for="new-todo">New todo</label>
    <input id="new-todo" name="title" autocomplete="off">
    <button type="submit">Add</button>
  </form>
  <ul id="list" role="list" aria-label="Todos"></ul>
  <p role="status" aria-label="Remaining">0 remaining</p>
  <script>
    const list = document.getElementById('list');
    const status = document.querySelector('[role=status]');
    const render = () => {
      const open = [...list.children].filter((li) => !li.classList.contains('done')).length;
      status.textContent = open + ' remaining';
    };
    document.getElementById('new').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('new-todo');
      const title = input.value.trim();
      if (!title) return;
      const li = document.createElement('li');
      li.setAttribute('role', 'listitem');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.setAttribute('aria-label', 'Complete ' + title);
      cb.addEventListener('change', () => { li.classList.toggle('done', cb.checked); render(); });
      const span = document.createElement('span');
      span.textContent = title;
      li.append(cb, span);
      list.append(li);
      input.value = '';
      render();
    });
    render();
  </script>
</main>`);

const parseCookies = (header = '') =>
  Object.fromEntries(
    header.split(';').map((c) => c.trim().split('=')).filter((p) => p[0]),
  );

const isAuthed = (req) => parseCookies(req.headers.cookie)['sid'] === SID;

const redirect = (res, location, headers = {}) => {
  res.writeHead(302, { Location: location, ...headers });
  res.end();
};

const html = (res, body, status = 200) => {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
  res.end(body);
};

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname;

  if (path === '/') return redirect(res, isAuthed(req) ? '/dashboard' : '/login');

  if (path === '/login' && req.method === 'GET')
    return html(res, loginPage(url.searchParams.get('error')));

  if (path === '/login' && req.method === 'POST') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      const body = new URLSearchParams(raw);
      if (body.get('email') === ADMIN_EMAIL && body.get('password') === ADMIN_PASSWORD)
        return redirect(res, '/dashboard', { 'Set-Cookie': `sid=${SID}; Path=/; HttpOnly` });
      return redirect(res, '/login?error=1');
    });
    return;
  }

  if (path === '/logout')
    return redirect(res, '/login', { 'Set-Cookie': 'sid=; Path=/; Max-Age=0' });

  if (path === '/dashboard')
    return isAuthed(req) ? html(res, dashboardPage()) : redirect(res, '/login');

  if (path === '/todos')
    return isAuthed(req) ? html(res, todosPage()) : redirect(res, '/login');

  html(res, page('Not found', '<main><h1>Not found</h1></main>'), 404);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`app listening on http://127.0.0.1:${PORT}`);
});
