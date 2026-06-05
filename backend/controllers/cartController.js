import userModel from "./../models/userModels.js";

// Add product to user cart
export const addToCart = async (req, res) => {
  try {
    console.log("CART BODY:", req.body);

    const userId = req.userId;

    if (!userId) {
      return res.json({
        success: false,
        message: "Unauthorized - userId missing"
      });
    }

    const {
      itemId,
      name,
      image,
      lens,
      features,
      prescription,
      totalAmount,
      quantity
    } = req.body;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    if (!Array.isArray(user.cartData)) {
      user.cartData = [];
    }

    const existingIndex = user.cartData.findIndex(
      (item) => item.itemId === itemId
    );

    if (existingIndex !== -1) {
      user.cartData[existingIndex].quantity += quantity || 1;
    } else {
      user.cartData.push({
        itemId,
        name,
        image,
        lens,
        features,
        prescription,
        totalAmount,
        quantity: quantity || 1
      });
    }

    await user.save();

    return res.json({
      success: true,
      message: "Added to Cart",
      cartData: user.cartData
    });

  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: error.message
    });
  }
};

// Update product quantity
export const updateCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { itemId, quantity } = req.body;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.json({
        success: false,
        message: "User not found"
      });
    }

    if (!Array.isArray(user.cartData)) {
      user.cartData = [];
    }

    const itemIndex = user.cartData.findIndex(
      (i) => i.itemId === itemId
    );

    if (itemIndex === -1) {
      return res.json({
        success: false,
        message: "Item not found in cart"
      });
    }

    // 🗑️ DELETE if quantity is 0 or less
    if (quantity <= 0) {
      user.cartData.splice(itemIndex, 1);
    } else {
      // ➕ UPDATE quantity
      user.cartData[itemIndex].quantity = quantity;
    }

    await user.save();

    return res.json({
      success: true,
      cartData: user.cartData
    });

  } catch (error) {
    console.log(error);
    return res.json({
      success: false,
      message: error.message
    });
  }
};

// Get user cart
export const getUserCart = async (req, res) => {
  try {
    const { userId } = req.body;
    const userData = await userModel.findById(userId);

    if (userData) {
      res.json({ success: true, cartData: userData.cartData || {} });
    } else {
      res.json({ success: false, message: "User not found" });
    }
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
export const syncCart = async (req, res) => {
  try {
    const userId = req.body.userId;
    const { cartItems } = req.body;

    const user = await userModel.findById(userId);

    user.cartData = cartItems; // or merge logic

    await user.save();

    res.json({ success: true });
  } catch (error) {
    res.json({ success: false });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const userId = req.userId;
    const { itemId } = req.body;

    const user = await userModel.findById(userId);

    user.cartData = user.cartData.filter((item) => item.itemId !== itemId);

    await user.save();

    res.json({ success: true, cartData: user.cartData });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
