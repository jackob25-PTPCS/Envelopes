const url = document.getElementById("url");
const msg = document.getElementById("msg");
const go = document.getElementById("go");

window.client.config().then((c) => { if (c.serverUrl) url.value = c.serverUrl; });

async function submit() {
  if (!url.value.trim()) return;
  go.disabled = true;
  msg.className = "msg";
  msg.textContent = "Looking for a server…";
  const res = await window.client.connect(url.value);
  if (!res.ok) {
    msg.className = "msg bad";
    msg.textContent = res.reason;
    go.disabled = false;
    url.select();
  }
  // on success the main process navigates away
}

go.addEventListener("click", submit);
url.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
