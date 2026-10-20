import request from "./request";

// 获取商品列表
export const getProductList = () => request.get("/product/list");

// 新增商品
export const addProduct = (data) => request.post("/product", data);

// 编辑商品
export const updateProduct = (id, data) => request.put(`/product/${id}`, data);

// 商品入库
export const stockIn = (data) => request.post("/product/stock-in", data);

// 删除商品
export const deleteProduct = (id) => request.delete(`/product/${id}`);

// 批量删除
export const batchDeleteProducts = (ids) =>
  request.post("/product/batch-delete", { ids });

// 上下架
export const updateProductStatus = (id, status) =>
  request.put(`/product/${id}/status`, { status });

// 批量改价
export const batchUpdatePrice = (data) =>
  request.post("/product/batch-price", data);

// 导出商品清单 Excel
export const exportProducts = () =>
  request.get("/product/export", { responseType: "blob" });
