(() => {
  const items = [
    ["dashboard", "Visão geral", "◫"],
    ["products", "Produtos", "▧"],
    ["sales", "Vendas", "↗"],
    ["finance", "Financeiro", "◉"],
    ["categories", "Categorias", "☷"],
  ];
  const navigation = document.createElement("nav");
  navigation.className = "mobile-nav";
  navigation.setAttribute("aria-label", "Navegação do painel");
  navigation.innerHTML = items
    .map(
      ([view, label, icon]) =>
        `<button type="button" data-view="${view}" aria-label="${label}"><span class="mobile-nav-icon">${icon}</span><span>${label}</span></button>`,
    )
    .join("");
  document.body.append(navigation);

  navigation.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => navigate(button.dataset.view));
  });

  const baseNavigate = window.navigate;
  window.navigate = (view) => {
    baseNavigate(view);
    navigation.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.view === view);
    });
  };
  navigation.querySelector('[data-view="dashboard"]').classList.add("active");
})();
