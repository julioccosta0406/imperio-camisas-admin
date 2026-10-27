// Imports the stock and sales worksheet locally in the browser.
(() => {
  const SHEETJS_URL =
    "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
  const importButton = document.createElement("button");
  const fileInput = document.createElement("input");
  let xlsxPromise;

  importButton.type = "button";
  importButton.className = "btn";
  importButton.textContent = "⇧  Importar Excel";
  importButton.title = "Importar produtos e vendas de uma planilha";

  fileInput.type = "file";
  fileInput.accept = ".xlsx,.xls,.csv";
  fileInput.hidden = true;
  fileInput.id = "excel-import-file";

  const productHeading = document.querySelector("#view-products > .head");
  const newProductButton = productHeading?.querySelector("button");
  if (productHeading && newProductButton) {
    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;gap:8px;align-items:center";
    newProductButton.before(actions);
    actions.append(importButton, newProductButton);
    productHeading.append(fileInput);
  }

  importButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      const { rows, sheetName } = await readWorkbook(file);
      showPreview(rows, sheetName, file.name);
    } catch (error) {
      alert(error.message || "Não consegui ler essa planilha.");
    } finally {
      fileInput.value = "";
    }
  });

  function loadSheetJS() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!xlsxPromise) {
      xlsxPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = SHEETJS_URL;
        script.onload = () => resolve(window.XLSX);
        script.onerror = () => reject(
          new Error("Não foi possível carregar o leitor de Excel. Confira sua conexão e tente novamente."),
        );
        document.head.append(script);
      });
    }
    return xlsxPromise;
  }

  async function readWorkbook(file) {
    const XLSX = await loadSheetJS();
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const headerAliases = {
      phone: ["numero", "telefone", "celular"],
      customer: ["cliente", "nome do cliente"],
      size: ["tamanho", "tam"],
      model: ["modelo", "categoria", "tipo"],
      team: ["time", "clube", "produto", "nome"],
      buy: ["valor pago", "custo", "valor de compra"],
      expenses: ["despesas", "frete", "taxa", "custo adicional"],
      sold: ["valor vendido", "preco de venda", "preco vendido"],
      payment: ["status", "pagamento", "status do pagamento"],
    };

    for (const sheetName of workbook.SheetNames) {
      const values = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
        header: 1,
        defval: "",
        raw: false,
      });
      const headerIndex = values.findIndex((row) => {
        const headers = row.map(normalize);
        return ["model", "team", "buy", "sold"].every((key) =>
          headers.some((header) => headerAliases[key].includes(header)),
        );
      });
      if (headerIndex < 0) continue;

      const headers = values[headerIndex].map(normalize);
      const columns = Object.fromEntries(
        Object.entries(headerAliases).map(([key, aliases]) => [
          key,
          headers.findIndex((header) => aliases.includes(header)),
        ]),
      );
      const rows = values.slice(headerIndex + 1).flatMap((row, offset) => {
        if (!row.some((value) => String(value).trim())) return [];
        const get = (key) => columns[key] < 0 ? "" : row[columns[key]] ?? "";
        const item = {
          sourceRow: headerIndex + offset + 2,
          phone: String(get("phone")).trim(),
          customer: String(get("customer")).trim(),
          size: String(get("size")).trim(),
          model: String(get("model")).trim(),
          team: String(get("team")).trim(),
          buy: parseAmount(get("buy")),
          expenses: parseAmount(get("expenses")),
          sold: parseAmount(get("sold")),
          payment: String(get("payment")).trim(),
        };
        if (!item.team && !item.model && !item.customer && !item.phone) return [];
        item.isSale = Boolean(item.customer || item.phone || item.payment);
        item.importKey = `excel:${normalize(sheetName)}:${item.sourceRow}`;
        item.category = categoryFor(item.model);
        item.productName = item.team
          ? `Camisa ${item.team}`
          : `Camisa ${item.model || "sem modelo"}`;
        item.duplicate = (db.importedRows || []).includes(item.importKey);
        item.problem = !item.productName || (!item.isSale && !item.team);
        return [item];
      });
      if (!rows.length) throw new Error(`Não encontrei linhas de produtos na aba “${sheetName}”.`);
      return { rows, sheetName };
    }
    throw new Error("Não encontrei uma aba com as colunas Modelo, Time, Valor pago e Valor vendido.");
  }

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function parseAmount(value) {
    if (typeof value === "number") return value;
    let text = String(value ?? "").trim().replace(/[^\d,.-]/g, "");
    if (!text) return 0;
    if (text.includes(",")) text = text.replace(/\./g, "").replace(",", ".");
    const number = Number(text);
    return Number.isFinite(number) ? number : 0;
  }

  function categoryFor(model) {
    const value = normalize(model);
    if (value.includes("infantil")) return "Camisas modelo infantil";
    if (value.includes("fem")) return "Camisas feminina";
    if (value.includes("jog")) return "Camisas modelo jogador";
    if (value.includes("retro")) return "Camisas modelo retrô";
    if (value.includes("torc")) return "Camisas modelo torcedor";
    return model ? `Camisas modelo ${model}` : "Camisas modelo torcedor";
  }

  function showPreview(rows, sheetName, fileName) {
    const eligible = rows.filter((row) => !row.duplicate && !row.problem);
    const sales = eligible.filter((row) => row.isSale).length;
    const stock = eligible.length - sales;
    const duplicateCount = rows.filter((row) => row.duplicate).length;
    const problemCount = rows.filter((row) => row.problem).length;
    const preview = rows.slice(0, 10).map((row) => `
      <tr>
        <td>${row.sourceRow}</td>
        <td>${esc(row.productName)}</td>
        <td>${esc(row.category)}</td>
        <td>${esc(row.size || "—")}</td>
        <td>${row.isSale ? `Venda · ${esc(row.customer || "cliente sem nome")}` : "Estoque"}</td>
        <td>${row.isSale ? money(row.sold) : "—"}</td>
        <td>${row.duplicate ? '<span class="pill yellow">Já importada</span>' : row.problem ? '<span class="pill red">Revisar</span>' : "Pronta"}</td>
      </tr>`).join("");

    document.getElementById("modal-title").textContent = "Revisar importação";
    document.getElementById("modal-body").innerHTML = `
      <p class="sub" style="margin:0 0 12px">Arquivo: <strong>${esc(fileName)}</strong> · Aba encontrada: <strong>${esc(sheetName)}</strong></p>
      <div class="summary-strip">
        <div class="summary-item"><span>Linhas prontas</span><strong>${eligible.length}</strong></div>
        <div class="summary-item"><span>Vendas</span><strong>${sales}</strong></div>
        <div class="summary-item"><span>Itens em estoque</span><strong>${stock}</strong></div>
      </div>
      <p class="sub" style="margin:0 0 12px">Considerei uma unidade por linha. Linhas com cliente, telefone ou status entram como venda; as demais entram no estoque. “Despesas” será somado ao custo unitário. Como a planilha não informa entrega nem data, vendas serão importadas como “A entregar” usando a data de hoje.</p>
      ${duplicateCount ? `<p class="sub" style="color:#997832;margin:0 0 8px">${duplicateCount} linha(s) já importada(s) serão ignoradas.</p>` : ""}
      ${problemCount ? `<p class="sub" style="color:#b5544e;margin:0 0 8px">${problemCount} linha(s) precisam de revisão e não serão importadas.</p>` : ""}
      <div class="table-scroll" style="max-height:260px;border:1px solid var(--line);border-radius:6px"><table><thead><tr><th>Linha</th><th>Produto</th><th>Categoria</th><th>Tamanho</th><th>Tipo de registro</th><th>Valor</th><th></th></tr></thead><tbody>${preview || '<tr><td colspan="7" class="empty">Todas as linhas já foram importadas.</td></tr>'}</tbody></table></div>
      <div class="modal-actions"><button type="button" class="btn" onclick="closeModal()">Cancelar</button><button type="button" class="btn dark" id="confirm-excel-import" ${eligible.length ? "" : "disabled"}>Importar ${eligible.length} linha(s)</button></div>`;
    document.getElementById("modal-bg").classList.add("show");
    document.getElementById("confirm-excel-import")?.addEventListener("click", () => {
      importRows(eligible);
      closeModal();
      save();
      ping(`${eligible.length} linha(s) importada(s) com sucesso.`);
    });
  }

  function importRows(rows) {
    const groups = new Map();
    for (const row of rows) {
      const identity = JSON.stringify([
        row.productName,
        row.category,
        row.size,
        row.buy,
        row.expenses,
        row.sold,
      ]);
      if (!groups.has(identity)) {
        groups.set(identity, {
          id: crypto.randomUUID(),
          name: row.productName,
          sku: "",
          category: row.category,
          size: row.size,
          stock: 0,
          buy: row.buy,
          freight: row.expenses,
          tax: 0,
          price: row.sold,
          promo: 0,
          arrival: "Chegou",
          notes: "Importado da planilha; despesas sem separação de frete e importação.",
          image: "",
        });
      }
      const product = groups.get(identity);
      if (!db.categories.includes(product.category)) db.categories.push(product.category);
      if (row.isSale) {
        const status = normalize(row.payment);
        const paid = status === "pago" || status === "recebido" || status === "quitado";
        db.sales.push({
          id: crypto.randomUUID(),
          productId: product.id,
          productName: product.name,
          unitCost: row.buy + row.expenses,
          qty: 1,
          unitPrice: row.sold,
          listPrice: row.sold,
          priceMode: "original",
          total: row.sold,
          customer: row.customer,
          date: new Date().toISOString().slice(0, 10),
          payment: paid ? "Pago" : "Pendente",
          delivery: "A entregar",
          notes: row.phone ? `Telefone: ${row.phone}` : "",
        });
      } else {
        product.stock += 1;
      }
      db.importedRows ||= [];
      db.importedRows.push(row.importKey);
    }
    db.products.push(...groups.values());
  }
})();
