import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: String, required: true }, // String allows "£89.99"
    description: { type: String, required: true },
    inStock: { type: Boolean, default: true }
});

const Product = mongoose.model('Product', productSchema);
export default Product;