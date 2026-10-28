// Additional fields and opening balances for the private shop dashboard.
(() => {
  const regularSizes = ["P", "M", "G", "GG", "2XL"];
  const kidsSizes = ["20", "22", "24", "26", "28"];
  const baseOpenModal = window.openModal;
  const baseRenderFinance = window.renderFinance;
  const baseRenderDashboard = window.renderDashboard;
  const baseRenderProducts = window.renderProducts;
  const baseRenderSales = window.renderSales;
  db.financeAdjustments ||= {
    revenue: 0,
    received: 0,
    stockCost: 0,
    toReceive: 0,
  };
  for (const key of ["revenue", "received", "stockCost", "toReceive"])
    db.financeAdjustments[key] = Number(db.financeAdjustments[key]) || 0;
  const financeBase = () => {
    const revenue =
      db.openingRevenue +
      db.sales.reduce((sum, sale) => sum + (+sale.total || 0), 0);
    const received =
      db.openingRevenue +
      db.sales
        .filter((sale) => sale.payment === "Pago")
        .reduce((sum, sale) => sum + (+sale.total || 0), 0);
    const stockCost =
      db.openingStockCost +
      db.products
        .filter((product) => (product.arrival || "Chegou") === "Chegou")
        .reduce(
          (sum, product) => sum + cost(product) * (+product.stock || 0),
          0,
        );
    return { revenue, received, stockCost, toReceive: revenue - received };
  };
  const financeValues = () => {
    const base = financeBase();
    return Object.fromEntries(
      Object.keys(base).map((key) => [
        key,
        Math.max(0, base[key] + db.financeAdjustments[key]),
      ]),
    );
  };
  window.units = () =>
    db.products
      .filter((product) => (product.arrival || "Chegou") === "Chegou")
      .reduce((sum, product) => sum + (+product.stock || 0), 0);
  const sizeHeader = document.querySelector(
    "#view-products thead th:nth-child(2)",
  );
  if (sizeHeader)
    sizeHeader.insertAdjacentHTML(
      "afterend",
      "<th>Tamanho</th><th>Chegada</th>",
    );
  const quantityHeader = document.querySelector(
    "#view-sales thead th:nth-child(4)",
  );
  if (quantityHeader)
    quantityHeader.insertAdjacentHTML("afterend", "<th>Preço unit.</th>");
  const financeEditButton = document.querySelector(
    '#view-finance .head button[onclick*="opening"]',
  );
  if (financeEditButton)
    financeEditButton.textContent = "✎  Editar valores financeiros";

  window.renderProducts = function () {
    baseRenderProducts();
    const query = (
      document.getElementById("product-search")?.value || ""
    ).toLowerCase();
    const category = document.getElementById("product-cat-filter")?.value || "";
    const visible = db.products.filter(
      (product) =>
        (!query ||
          (product.name + " " + product.sku + " " + product.category)
            .toLowerCase()
            .includes(query)) &&
        (!category || product.category === category),
    );
    document.querySelectorAll("#product-rows tr").forEach((row, index) => {
      if (row.querySelector(".empty")) {
        const cell = row.querySelector(".empty");
        if (cell) cell.colSpan = 10;
        return;
      }
      const product = visible[index];
      if (product) {
        row.children[1].insertAdjacentHTML(
          "afterend",
          `<td>${esc(product.size || "—")}</td>`,
        );
        row.children[2].insertAdjacentHTML(
          "afterend",
          `<td><span class="pill ${(product.arrival || "Chegou") === "Chegou" ? "green" : "yellow"}">${esc(product.arrival || "Chegou")}</span></td>`,
        );
        const sellButton = row.querySelectorAll(".row-actions .icon-btn")[1];
        if (
          sellButton &&
          (product.arrival || "Chegou") === "Chegou" &&
          product.stock > 0
        ) {
          const button = document.createElement("button");
          button.className = "btn";
          button.textContent = "Vendeu";
          button.title = "Registrar venda";
          button.style.cssText =
            "background:#eaf3ed;color:#36744f;border-color:#d8e9dd;padding:6px 9px;font-size:10px";
          button.onclick = () => openModal("sale", product.id);
          sellButton.replaceWith(button);
        }
      }
    });
  };

  function optionsFor(category) {
    return category === "Camisas modelo infantil" ? kidsSizes : regularSizes;
  }

  window.openModal = function (type, id = "") {
    if (type === "sale-edit") {
      const sale = db.sales.find((item) => item.id === id);
      if (!sale) return ping("Venda não encontrada.");
      const product = db.products.find((item) => item.id === sale.productId);
      const listPrice = Number(sale.listPrice) || Number(sale.unitPrice) || 0;
      const discounted = Number(sale.unitPrice) < listPrice;
      document.getElementById("modal-bg").classList.add("show");
      document.getElementById("modal-title").textContent = "Editar venda";
      document.getElementById("modal-body").innerHTML = `
        <form id="form-sale-edit"><div class="form-grid">
          <div class="field"><label>Cliente</label><input name="customer" value="${esc(sale.customer || "")}"></div>
          <div class="field"><label>Data da venda</label><input name="date" type="date" required value="${esc(sale.date)}"></div>
          <div class="field"><label>Quantidade</label><input name="qty" type="number" min="1" required value="${sale.qty}"></div>
          <div class="field"><label>Preço aplicado</label><select name="priceMode"><option value="original" ${discounted ? "" : "selected"}>Preço original (${money(listPrice)})</option><option value="discount" ${discounted ? "selected" : ""}>Preço com desconto</option></select></div>
          <div class="field"><label>Preço vendido por unidade (R$)</label><input name="unitPrice" type="number" min="0.01" step="0.01" value="${Number(sale.unitPrice).toFixed(2)}" ${discounted ? "" : "disabled"}></div>
          <div class="field"><label>Pagamento</label><select name="payment"><option ${sale.payment === "Pendente" ? "selected" : ""}>Pendente</option><option ${sale.payment === "Pago" ? "selected" : ""}>Pago</option></select></div>
          <div class="field"><label>Entrega</label><select name="delivery"><option ${sale.delivery === "A entregar" ? "selected" : ""}>A entregar</option><option ${sale.delivery === "Entregue" ? "selected" : ""}>Entregue</option></select></div>
          <div class="field full"><label>Observações</label><textarea name="notes">${esc(sale.notes || "")}</textarea></div>
        </div><div class="modal-actions"><button type="button" class="btn" onclick="closeModal()">Cancelar</button><button class="btn dark">Salvar alterações</button></div></form>`;
      const form = document.getElementById("form-sale-edit");
      const mode = form.elements.priceMode,
        unitPrice = form.elements.unitPrice;
      mode.onchange = () => {
        unitPrice.disabled = mode.value === "original";
        if (mode.value === "original") unitPrice.value = listPrice.toFixed(2);
        else if (Number(unitPrice.value) >= listPrice) unitPrice.value = "";
      };
      form.onsubmit = (event) => {
        event.preventDefault();
        const qty = Number(form.elements.qty.value);
        const newPrice =
          mode.value === "original" ? listPrice : Number(unitPrice.value);
        if (mode.value === "discount" && (!newPrice || newPrice >= listPrice))
          return ping(
            "O preço com desconto deve ser menor que o preço original.",
          );
        if (product && qty > product.stock + sale.qty)
          return ping("Essa quantidade passa do estoque disponível.");
        if (product) product.stock += sale.qty - qty;
        sale.customer = form.elements.customer.value.trim();
        sale.date = form.elements.date.value;
        sale.qty = qty;
        sale.unitPrice = newPrice;
        sale.listPrice = listPrice;
        sale.priceMode = mode.value;
        sale.total = newPrice * qty;
        sale.payment = form.elements.payment.value;
        sale.delivery = form.elements.delivery.value;
        sale.notes = form.elements.notes.value;
        if (product) sale.unitCost = cost(product);
        closeModal();
        save();
        ping("Venda atualizada.");
      };
      return;
    }
    if (type === "opening" || type === "finance-edit") {
      document.getElementById("modal-bg").classList.add("show");
      document.getElementById("modal-title").textContent =
        "Editar valores do financeiro";
      const current = financeValues();
      document.getElementById("modal-body").innerHTML = `
        <p class="sub" style="margin:0 0 16px">Ajuste cada total para refletir os valores atuais do seu negócio. Os próximos registros continuam atualizando esses números.</p>
        <form id="form-opening"><div class="form-grid">
          <div class="field"><label>Receita registrada (R$)</label><input name="revenue" type="number" min="0" step="0.01" value="${current.revenue.toFixed(2)}"></div>
          <div class="field"><label>Já recebido (R$)</label><input name="received" type="number" min="0" step="0.01" value="${current.received.toFixed(2)}"></div>
          <div class="field"><label>Custo do estoque atual (R$)</label><input name="stockCost" type="number" min="0" step="0.01" value="${current.stockCost.toFixed(2)}"></div>
          <div class="field"><label>A receber (R$)</label><input name="toReceive" type="number" min="0" step="0.01" value="${current.toReceive.toFixed(2)}"></div>
        </div><div class="modal-actions"><button type="button" class="btn" onclick="closeModal()">Cancelar</button><button class="btn dark">Salvar valores</button></div></form>`;
      document.getElementById("form-opening").onsubmit = (event) => {
        event.preventDefault();
        const values = new FormData(event.target);
        const base = financeBase();
        for (const key of ["revenue", "received", "stockCost", "toReceive"])
          db.financeAdjustments[key] =
            Math.max(0, Number(values.get(key)) || 0) - base[key];
        closeModal();
        save();
        ping("Valores do financeiro atualizados.");
      };
      return;
    }

    baseOpenModal(type, id);
    if (type === "sale") {
      const saleForm = document.getElementById("form-sale");
      const productSelect = saleForm?.elements.product;
      if (productSelect)
        [...productSelect.options].forEach((option) => {
          const product = db.products.find((item) => item.id === option.value);
          if (product && product.arrival && product.arrival !== "Chegou")
            option.remove();
        });
      if (saleForm) {
        const submitSale = saleForm.onsubmit;
        const priceMode = document.createElement("select");
        priceMode.name = "priceMode";
        priceMode.innerHTML =
          '<option value="original">Preço original</option><option value="discount">Preço com desconto</option>';
        const priceField = saleForm.elements.unitPrice.closest(".field");
        priceField.insertAdjacentElement(
          "beforebegin",
          Object.assign(document.createElement("div"), {
            className: "field",
            innerHTML: "<label>Preço aplicado</label>",
          }),
        );
        priceField.previousElementSibling.appendChild(priceMode);
        const unitPrice = saleForm.elements.unitPrice;
        unitPrice.disabled = true;
        priceMode.onchange = () => {
          const selected = db.products.find(
            (item) => item.id === productSelect.value,
          );
          if (priceMode.value === "original") {
            unitPrice.disabled = true;
            unitPrice.value = selected ? price(selected) : "";
          } else {
            unitPrice.disabled = false;
            unitPrice.value = "";
            unitPrice.placeholder = "Informe o preço com desconto";
            unitPrice.focus();
          }
        };
        productSelect.addEventListener("change", () => {
          if (priceMode.value === "original") priceMode.onchange();
        });
        saleForm.onsubmit = (event) => {
          const selected = db.products.find(
            (item) => item.id === saleForm.elements.product.value,
          );
          if (selected && selected.arrival && selected.arrival !== "Chegou") {
            event.preventDefault();
            ping("Este produto ainda não chegou.");
            return;
          }
          const originalPrice = selected ? price(selected) : 0;
          const actualPrice =
            priceMode.value === "original"
              ? originalPrice
              : Number(unitPrice.value);
          if (
            !selected ||
            !actualPrice ||
            (priceMode.value === "discount" && actualPrice >= originalPrice)
          ) {
            event.preventDefault();
            ping(
              "Escolha o preço original ou informe um desconto abaixo do preço original.",
            );
            return;
          }
          submitSale.call(saleForm, event);
          if (event.defaultPrevented) {
            const savedSale = [...db.sales]
              .reverse()
              .find(
                (sale) =>
                  sale.productId === selected.id &&
                  sale.date === saleForm.elements.date.value,
              );
            if (savedSale) {
              savedSale.listPrice = originalPrice;
              savedSale.priceMode = priceMode.value;
              save();
            }
          }
        };
      }
      return;
    }
    if (type !== "product") return;
    const form = document.getElementById("form-product");
    const category = form.elements.category;
    const product = db.products.find((item) => item.id === id);
    const stockField = form.elements.stock.closest(".field");
    const sizeField = document.createElement("div");
    sizeField.className = "field";
    sizeField.innerHTML = '<label>Tamanho</label><select name="size"></select>';
    stockField.insertAdjacentElement("afterend", sizeField);
    const sizeSelect = sizeField.querySelector("select");
    function refreshSizes() {
      const sizes = optionsFor(category.value);
      sizeSelect.innerHTML = sizes
        .map((size) => `<option>${size}</option>`)
        .join("");
      sizeSelect.value = sizes.includes(product?.size)
        ? product.size
        : sizes[0];
    }
    category.addEventListener("change", refreshSizes);
    refreshSizes();
    const arrivalField = document.createElement("div");
    arrivalField.className = "field";
    arrivalField.innerHTML =
      '<label>Chegada do produto</label><select name="arrival"><option>Chegou</option><option>Aguardando chegada</option></select>';
    sizeField.insertAdjacentElement("afterend", arrivalField);
    const arrivalSelect = arrivalField.querySelector("select");
    arrivalSelect.value = product?.arrival || "Chegou";
  };

  window.renderDashboard = function () {
    baseRenderDashboard();
    const card = document.querySelector(
      "#dashboard-cards .card:nth-child(3) .card-value",
    );
    if (card) card.textContent = money(financeValues().revenue);
  };

  window.renderFinance = function () {
    baseRenderFinance();
    const current = financeValues();
    const totalInvestidoNasPecasVendidas = db.sales.reduce(
      (sum, sale) =>
        sum + (Number(sale.unitCost) || 0) * (Number(sale.qty) || 0),
      0,
    );
    const unitsRecorded =
      db.products.reduce((sum, product) => sum + (Number(product.stock) || 0), 0) +
      db.sales.reduce((sum, sale) => sum + (Number(sale.qty) || 0), 0);
    const totalVendido = current.revenue;
    const grossProfit = Math.max(
      0,
      totalVendido - totalInvestidoNasPecasVendidas,
    );
    const values = {
      units: `${unitsRecorded} un.`,
      purchases: money(current.stockCost + totalInvestidoNasPecasVendidas),
      revenue: money(current.revenue),
      profit: money(grossProfit),
      margin: `${current.revenue > 0 ? ((grossProfit / current.revenue) * 100).toFixed(1).replace(".", ",") : "0,0"}%`,
      received: money(current.received),
      toReceive: money(current.toReceive),
      stockCost: money(current.stockCost),
    };
    for (const [key, value] of Object.entries(values)) {
      const cardValue = document.querySelector(
        `#finance-cards [data-finance="${key}"]`,
      );
      if (cardValue) cardValue.textContent = value;
    }
  };

  window.renderSales = function () {
    baseRenderSales();
    const search = (
      document.getElementById("sale-search")?.value || ""
    ).toLowerCase();
    const rows = [...db.sales]
      .filter(
        (sale) =>
          (saleFilter === "Todos" ||
            (saleFilter === "Entregue"
              ? sale.delivery === "Entregue"
              : sale.payment === saleFilter)) &&
          (!search ||
            (sale.customer + " " + sale.productName)
              .toLowerCase()
              .includes(search)),
      )
      .sort((a, b) => b.date.localeCompare(a.date));
    document.querySelectorAll("#sale-rows tr").forEach((row, index) => {
      const sale = rows[index];
      if (row.querySelector(".empty")) {
        const cell = row.querySelector(".empty");
        if (cell) cell.colSpan = 9;
        return;
      }
      if (!sale) return;
      row.children[3].insertAdjacentHTML(
        "afterend",
        `<td>${money(sale.unitPrice)}${sale.priceMode === "discount" ? ' <span class="pill yellow">Desconto</span>' : ""}</td>`,
      );
      const actions = row.lastElementChild;
      const edit = document.createElement("button");
      edit.className = "icon-btn";
      edit.title = "Editar venda";
      edit.textContent = "✎";
      edit.onclick = () => openModal("sale-edit", sale.id);
      actions.insertBefore(edit, actions.firstChild);
    });
  };
})();
