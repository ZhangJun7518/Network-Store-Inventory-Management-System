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
