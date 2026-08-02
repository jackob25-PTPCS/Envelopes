const params = new URLSearchParams(location.search);
document.getElementById("host").textContent = params.get("url") || "the server";
document.getElementById("reason").textContent = params.get("reason") || "";

const retry = document.getElementById("retry");
retry.addEventListener("click", async () => {
  retry.disabled = true;
  retry.textContent = "Trying…";
  await window.client.retry();
  retry.disabled = false;
  retry.textContent = "Try again";
});

document.getElementById("change").addEventListener("click", () => window.client.forget());
