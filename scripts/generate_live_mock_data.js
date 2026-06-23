import fs from 'fs';
import path from 'path';

const REMOTE_URL = "http://100.104.229.84:8080/mcp";
const API_KEY    = "8dfbc8cc6be3930e6127089cfa35cbd350573732856ced96460455bdf1c5052b";

async function runMcpTool(toolName, args = {}) {
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: toolName,
      arguments: args
    }
  };

  const response = await fetch(REMOTE_URL, {
    method: "POST",
    headers: {
      "X-API-Key":   API_KEY,
      "Accept":      "application/json, text/event-stream",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const text = await response.text();
  const lines = text.split("\n");
  let dataLine = null;
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      dataLine = line.slice(6).trim();
      break;
    }
  }
  if (!dataLine) throw new Error("No data in response");
  const parsed = JSON.parse(dataLine);
  if (parsed.error) {
    throw new Error(parsed.error.message || JSON.stringify(parsed.error));
  }
  return parsed.result;
}

async function queryAll(sql) {
  const result = await runMcpTool("query", { sql });
  if (result && result.content && result.content[0] && result.content[0].text) {
    const text = result.content[0].text;
    const parsed = JSON.parse(text);
    return parsed.rows || [];
  }
  return [];
}

async function main() {
  console.log("Fetching live businesses...");
  const businesses = await queryAll("SELECT id, name, is_active FROM public.keusahawanan_businesses WHERE status = 'ACTIVE';");

  console.log("Fetching live products...");
  const products = await queryAll("SELECT id, business_id, name, price, category, is_available, variations, stock_quantity, reserved_stock FROM public.business_products;");
  // Parse numeric values and format correctly
  const formattedProducts = products.map(p => ({
    id: p.id,
    business_id: p.business_id,
    name: p.name,
    price: parseFloat(p.price || 0),
    category: p.category,
    is_available: p.is_available,
    variations: Array.isArray(p.variations) ? p.variations : JSON.parse(p.variations || '[]'),
    stock_quantity: parseInt(p.stock_quantity || 0),
    reserved_stock: parseInt(p.reserved_stock || 0)
  }));

  console.log("Fetching live orders...");
  const ordersSql = `
    SELECT 
      o.id,
      o.quantity,
      o.unit_price,
      o.total_price,
      o.note,
      o.pickup_time,
      o.share_phone,
      o.status,
      o.created_at,
      o.business_id,
      o.payment_method,
      o.payment_receipt_url,
      o.payment_receipt_rejected,
      o.payment_verified_at,
      o.payment_verified_by,
      o.payment_deadline_at,
      o.selected_variation,
      o.cancellation_requested_at,
      o.cancellation_reason,
      json_build_object(
        'id', p.id,
        'name', p.name,
        'image_url', p.image_url,
        'category', p.category
      ) as business_products,
      json_build_object(
        'id', buyer.id,
        'full_name', buyer.full_name,
        'matric_no', buyer.matric_no,
        'phone', buyer.phone
      ) as buyer
    FROM public.polymart_orders o
    LEFT JOIN public.business_products p ON o.product_id = p.id
    LEFT JOIN public.profiles buyer ON o.buyer_id = buyer.id
    ORDER BY o.created_at DESC;
  `;
  const orders = await queryAll(ordersSql);
  
  // Format orders properly
  const formattedOrders = orders.map(o => {
    // Parse nested JSON if it was returned as string
    let bizProd = o.business_products;
    if (typeof bizProd === 'string') bizProd = JSON.parse(bizProd);
    
    let buyerObj = o.buyer;
    if (typeof buyerObj === 'string') buyerObj = JSON.parse(buyerObj);
    
    return {
      id: o.id,
      quantity: parseInt(o.quantity || 1),
      unit_price: parseFloat(o.unit_price || 0),
      total_price: o.total_price ? parseFloat(o.total_price) : parseFloat(o.unit_price || 0) * parseInt(o.quantity || 1),
      note: o.note,
      pickup_time: o.pickup_time,
      share_phone: o.share_phone,
      status: o.status,
      created_at: o.created_at,
      business_id: o.business_id,
      payment_method: o.payment_method,
      payment_receipt_url: o.payment_receipt_url,
      payment_receipt_rejected: o.payment_receipt_rejected,
      payment_verified_at: o.payment_verified_at,
      payment_verified_by: o.payment_verified_by,
      payment_deadline_at: o.payment_deadline_at,
      selected_variation: o.selected_variation,
      cancellation_requested_at: o.cancellation_requested_at,
      cancellation_reason: o.cancellation_reason,
      business_products: bizProd,
      buyer: buyerObj
    };
  });

  const dataset = {
    businesses,
    products: formattedProducts,
    orders: formattedOrders
  };

  const outputPath = path.resolve("src/pages/polymart/mockData.json");
  fs.writeFileSync(outputPath, JSON.stringify(dataset, null, 2), "utf8");
  console.log(`Successfully generated ${outputPath} with:`);
  console.log(`- ${businesses.length} businesses`);
  console.log(`- ${formattedProducts.length} products`);
  console.log(`- ${formattedOrders.length} orders`);
}

main().catch(console.error);
