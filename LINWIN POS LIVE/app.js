// =====================
// CONFIG / STATE
// =====================
const API = "https://script.google.com/macros/s/AKfycbw6xqfdvfEyvbm4n2g0jCg2gXekUHRhS_FTYG6_JDh_hgm2Qblpk4c49soZEeoiK1YA/exec";

let cart = [];
let products = [];

// =====================
// INIT
// =====================
document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadProducts();
  renderCart();
  loadDailyTotals(); // ✅ FIX: call totals here
});

// =====================
// EVENTS
// =====================
function bindEvents() {
  document.getElementById("shopSelect")
    .addEventListener("change", renderProducts);
}

// =====================
// LOAD PRODUCTS
// =====================
async function loadProducts() {
  const container = document.getElementById("products");
  container.innerHTML = "Loading...";

  try {
    const res = await fetch(API);
    const text = await res.text();

    console.log("RAW PRODUCTS:", text);

    const data = JSON.parse(text);

    products = data;

    renderProducts();

  } catch (err) {
    console.error("Load error:", err);
    container.innerHTML = "Failed to load products";
  }
}

// =====================
// LOAD TOTALS (FIXED POSITION)
// =====================
async function loadDailyTotals() {
  try {
    console.log("📊 requesting totals...");

    const res = await fetch(API + "?report=daily");
    const text = await res.text();

    console.log("RAW TOTALS:", text);

    const data = JSON.parse(text);

    renderTotals(data);

  } catch (err) {
    console.error("Totals error:", err);
  }
}

// =====================
// RENDER TOTALS
// =====================
function renderTotals(data) {
  const container = document.getElementById("totals");

  if (!container) return;

  container.innerHTML = "";

  Object.entries(data).forEach(([shop, total]) => {
    const card = document.createElement("div");
    card.className = "total-card";

    card.innerHTML = `
      <strong>${shop}</strong><br>
      KES ${total}
    `;

    container.appendChild(card);
  });
}

// =====================
// RENDER PRODUCTS
// =====================
function renderProducts() {
  const container = document.getElementById("products");
  const shop = document.getElementById("shopSelect").value;

  container.innerHTML = "";

  if (!products.length) {
    container.innerHTML = "Loading products...";
    return;
  }

  const filtered = products.filter(p =>
    (p.shop || "").trim().toLowerCase() === shop.trim().toLowerCase()
  );

  if (filtered.length === 0) {
    container.innerHTML = "No items for this shop";
    return;
  }

  filtered.forEach(p => {
    const div = document.createElement("div");
    div.className = "product";

    const isService = p.type === "service";

    div.innerHTML = `
      <span>
        ${p.name} - KES ${p.price}
        ${isService ? "<em>(Service)</em>" : `(Stock: ${p.stock})`}
      </span>
      <button>Add</button>
    `;

    div.querySelector("button").addEventListener("click", () => {
      addToCart(p);
    });

    container.appendChild(div);
  });
}

// =====================
// CART LOGIC
// =====================
function addToCart(product) {
  const item = cart.find(i => i.id === product.id);

  if (item) {
    item.qty++;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty: 1,
      type: product.type
    });
  }

  renderCart();
}

function changeQty(id, change) {
  const item = cart.find(i => i.id === id);
  if (!item) return;

  item.qty += change;

  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== id);
  }

  renderCart();
}

// =====================
// CART RENDER
// =====================
function renderCart() {
  const cartDiv = document.getElementById("cartItems");
  const totalSpan = document.getElementById("total");

  cartDiv.innerHTML = "";

  if (cart.length === 0) {
    cartDiv.innerHTML = "Cart is empty";
    totalSpan.innerText = 0;
    return;
  }

  let total = 0;

  cart.forEach(item => {
    total += item.qty * item.price;

    const row = document.createElement("div");
    row.className = "cart-item";

    row.innerHTML = `
      <span>${item.name}</span>

      <div class="controls">
        <button class="minus">−</button>
        <span>${item.qty}</span>
        <button class="plus">+</button>
      </div>

      <span>${item.qty * item.price}</span>
    `;

    row.querySelector(".minus").addEventListener("click", () => {
      changeQty(item.id, -1);
    });

    row.querySelector(".plus").addEventListener("click", () => {
      changeQty(item.id, 1);
    });

    cartDiv.appendChild(row);
  });

  totalSpan.innerText = total;
}

// =====================
// CHECKOUT
// =====================
async function checkout() {
  if (cart.length === 0) {
    alert("Cart is empty");
    return;
  }

  const shop = document.getElementById("shopSelect").value;

  const sale = {
    shop,
    items: cart,
    total: cart.reduce((sum, i) => sum + i.qty * i.price, 0),
    date: new Date().toISOString()
  };

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({ sale })
    });

    const text = await res.text();
    console.log("RAW RESPONSE:", text);

    const result = JSON.parse(text);

    if (result.status === "ok") {
      alert("Sale saved successfully");

      cart = [];
      renderCart();

      loadProducts();
      loadDailyTotals(); // ✅ refresh totals after sale

    } else {
      alert("Server error: " + result.message);
    }

  } catch (err) {
    console.error("Checkout failed:", err);
    alert("Network error during checkout");
  }
}
