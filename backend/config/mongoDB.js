import mongoose from "mongoose";

const connectDB = async () => {
    mongoose.connection.on('connected', () => {
        console.log(`✅ DB Connected to: ${mongoose.connection.name}`); 
    });

    try {
        // This will now work because the .env string is fixed
        await mongoose.connect(process.env.MONGODB_URI);
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error.message);
        process.exit(1);
    }
}

export default connectDB;