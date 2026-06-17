import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import axios from "axios";
import "react-toastify/dist/ReactToastify.css";
import { categoryMap, colorOptions } from "../../App";

const AddProduct = ({ token }) => {
  const [color, setColor] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const mainCategories = Object.keys(categoryMap);

  const [category, setCategory] = useState(mainCategories[0]);
  const [subCategory, setSubCategory] = useState(
    categoryMap[mainCategories[0]][0],
  );

  const emptyForm = {
    sku: "",
    name: "",
    brand: "",
    category: mainCategories[0],
    subCategory: categoryMap[mainCategories[0]][0],
    description: "",
    price: "",
    currency: "INR",
    minStockAlert: "3",
    cgst: "0",
    sgst: "0",
    specifications: {
      shape: "",
      material: "",
      size: "",
      color: "",
      dimensions: { lensWidth: "", bridgeWidth: "", templeLength: "" },
    },
    metadata: {
      gender: "",
      warranty: "",
      bestseller: false,
      newArrival: false,
    },
  };

  const [formData, setFormData] = useState(emptyForm);

  const FRAME_SHAPES = [
    "Round",
    "Rectangle",
    "CatEye",
    "Aviator",
    "Square",
    "ClubMaster",
    "Geometric",
    "Oval",
  ].sort();

  const MATERIAL = [
    "Acetate",
    "Metal",
    "Titanium",
    "TR90",
    "Wood",
    "SPX",
  ].sort();

  const BRAND_COLLECTIONS = {
    FRAMES: [
      "EYECON",
      "FASTRACK",
      "RAYBAN",
      "OAKLEY",
      "TOM FORD",
      "BURBERRY",
      "PRADA",
      "VERSACE",
      "MONTBLANC",
      "MICHAEL KORS",
      "CARTIER",
      "VOGUE",
    ].sort(),
    CONTACT_LENSES: [
      "JOHNSON AND JOHNSON",
      "BAUSCH-LOMB",
      "ALCON",
      "COOPER VISION",
      "AQUALENS",
      "O-LENS",
      "ARYAN",
      "SOLTICA",
    ].sort()
  };
  
  const TAX_RATES = ["0", "2.5", "6", "9", "12"];
  const isContactLens = category && category.toLowerCase().includes("contact");

  useEffect(() => {
    const fetchGeneratedSKU = async () => {
      try {
        const response = await axios.get(
          "http://localhost:4000/api/product/next-sku",
        );
        if (response.data.success) {
          setFormData((prev) => ({ ...prev, sku: response.data.sku }));
        }
      } catch (error) {
        console.error("Error pre-fetching SKU:", error);
      }
    };
    fetchGeneratedSKU();
  }, []);

  const handleCategoryChange = (e) => {
    const selectedCategory = e.target.value;
    setCategory(selectedCategory);
    const firstSub = categoryMap[selectedCategory]?.[0] || "";
    setSubCategory(firstSub);

    setFormData((prev) => ({
      ...prev,
      category: selectedCategory,
      subCategory: firstSub,
      brand: "", 
    }));
  };

  const handleSelect = (name) => {
    const selectedColor = name.toUpperCase();
    setColor(selectedColor);
    setFormData((prev) => ({
      ...prev,
      specifications: { ...prev.specifications, color: selectedColor },
    }));
    setIsOpen(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;

    if (name.includes(".")) {
      const keys = name.split(".");
      setFormData((prev) => {
        let updated = JSON.parse(JSON.stringify(prev));
        if (keys.length === 3) {
          if (!updated[keys[0]][keys[1]]) updated[keys[0]][keys[1]] = {};
          updated[keys[0]][keys[1]][keys[2]] = val;
        } else {
          if (!updated[keys[0]]) updated[keys[0]] = {};
          updated[keys[0]][keys[1]] = val;
        }
        return updated;
      });
    } else {
      setFormData((prev) => ({ ...prev, [name]: val }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const toastId = toast.loading("Uploading product configuration...");
    const backendUrl = "http://localhost:4000"; 

    try {
      const data = new FormData();

      data.append("sku", formData?.sku || "");
      data.append("name", formData?.name || "");
      data.append("brand", formData?.brand || "");
      data.append("category", category || ""); 
      data.append("subCategory", subCategory || "");
      data.append("price", formData?.price || "0");
      data.append("currency", formData?.currency || "INR");
      data.append("description", formData?.description || "");
      data.append("minStockAlert", formData?.minStockAlert || "3");
      data.append("stock", "0"); // 🌟 Forces initial master ledger entry to 0 pending purchase flow
      data.append("cgst", formData?.cgst || "0");
      data.append("sgst", formData?.sgst || "0");

      const safeSpecifications = {
        shape: isContactLens ? undefined : (formData?.specifications?.shape || ""),
        material: isContactLens ? undefined : (formData?.specifications?.material || ""),
        size: isContactLens ? undefined : (formData?.specifications?.size || ""),
        color: isContactLens ? undefined : (color || ""), 
        dimensions: isContactLens ? {
          lensWidth: undefined,
          bridgeWidth: undefined,
          templeLength: undefined
        } : {
          lensWidth: formData?.specifications?.dimensions?.lensWidth || undefined,
          bridgeWidth: formData?.specifications?.dimensions?.bridgeWidth || undefined,
          templeLength: formData?.specifications?.dimensions?.templeLength || undefined,
        }
      };
      data.append("specifications", JSON.stringify(safeSpecifications));

      const safeMetadata = {
        gender: formData?.metadata?.gender || "Unisex",
        warranty: formData?.metadata?.warranty || "No Warranty",
        bestseller: !!formData?.metadata?.bestseller,
        newArrival: !!formData?.metadata?.newArrival,
      };
      data.append("metadata", JSON.stringify(safeMetadata));

      const activeToken = localStorage.getItem("adminToken") || localStorage.getItem("token") || token || "";

      const response = await axios.post(`${backendUrl}/api/product/add`, data, {
        timeout: 20000, 
        headers: {
          "Content-Type": "multipart/form-data",
          token: activeToken, 
          Authorization: `Bearer ${activeToken}` 
        },
      });

      if (response.data && response.data.success) {
        toast.dismiss(toastId); 
        toast.success("Product Directory Entry Created Successfully!");

        setColor("");
        const lastSku = response.data.sku || formData.sku;
        const lastNumber = parseInt(lastSku.split("-")[1]) || 0;
        const nextSku = `SO-${(lastNumber + 1).toString().padStart(4, "0")}`;
        
        setFormData({ ...emptyForm, sku: nextSku });
      } else {
        toast.dismiss(toastId);
        toast.error(response.data?.message || "Failed to commit inventory additions.");
      }

    } catch (error) {
      console.error("CRITICAL FRONTEND SUBMIT BLOCK CRASH:", error);
      toast.dismiss(toastId); 
      let userDisplayError = "Network connection timeout.";
      if (error.response && error.response.data && error.response.data.message) {
        userDisplayError = error.response.data.message;
      } else if (error.message) {
        userDisplayError = error.message;
      }
      toast.error(userDisplayError);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto bg-cyan-100">
      <ToastContainer position="top-right" theme="colored" />

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">
            Add New Optical Product
          </h2>
          <p className="text-sm text-slate-500">
            Configure catalogs inside the Master Ledger directory. Quantities are managed separately via Purchase Operations.
          </p>
        </div>

        <div className="p-6 space-y-8">
          {/* Primary Info Rows */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">
                Product Name
              </label>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full mt-1 p-2.5 border border-slate-500 rounded-lg outline-none focus:border-cyan-500"
                placeholder="e.g. CatEye Computer Glasses for men"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                SKU Code
              </label>
              <input
                name="sku"
                value={formData.sku}
                readOnly
                className="w-full mt-1 p-2.5 border border-slate-300 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-slate-700">
                Product Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full mt-1 p-2.5 border border-slate-500 rounded-lg outline-none"
                placeholder="Describe your lenses, prescription elements, or custom features..."
              />
            </div>
          </section>

          {/* Categorization and Base Parameters */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                value={category}
                onChange={handleCategoryChange}
                className="w-full mt-1 p-2.5 border border-slate-500 rounded-lg bg-white"
                required
              >
                {mainCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Sub-Category
              </label>
              <select
                value={subCategory}
                onChange={(e) => {
                  setSubCategory(e.target.value);
                  setFormData((prev) => ({
                    ...prev,
                    subCategory: e.target.value,
                  }));
                }}
                className="w-full mt-1 p-2.5 border border-slate-500 rounded-lg bg-white"
                required
              >
                {(categoryMap[category] || []).map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Product Brand
              </label>
              <select
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                className="w-full mt-1 p-2.5 border border-slate-500 rounded-lg bg-white focus:border-cyan-500 outline-none"
                required
              >
                <option value="">Select Brand</option>
                {(isContactLens
                  ? BRAND_COLLECTIONS.CONTACT_LENSES 
                  : BRAND_COLLECTIONS.FRAMES
                ).map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Selling Price (INR)
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="w-full mt-1 p-2.5 border border-slate-500 rounded-lg"
                required
                placeholder="650"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Min Stock Alert
              </label>
              <input
                type="number"
                name="minStockAlert"
                value={formData.minStockAlert}
                onChange={handleChange}
                className="w-full mt-1 p-2.5 border border-slate-500 rounded-lg"
                placeholder="3"
              />
            </div>
          </section>

          {/* Technical Specifications Subform */}
          {!isContactLens && (
            <section className="p-5 bg-slate-50 rounded-xl space-y-4 border border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Physical & Framework Specifications
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs text-slate-500 font-semibold">
                    Frame Shape
                  </label>
                  <select
                    name="specifications.shape"
                    value={formData.specifications?.shape || ""}
                    onChange={handleChange}
                    className="w-full mt-1 p-2 border border-slate-500 rounded-md bg-white"
                  >
                    <option value="">Select</option>
                    {FRAME_SHAPES.map((shape) => (
                      <option key={shape} value={shape.toUpperCase()}>
                        {shape}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold">
                    Size
                  </label>
                  <select
                    name="specifications.size"
                    value={formData.specifications?.size || ""}
                    onChange={handleChange}
                    className="w-full mt-1 p-2 border border-slate-500 rounded-md bg-white"
                  >
                    <option value="">Size</option>
                    <option value="Small">Small</option>
                    <option value="Medium">Medium</option>
                    <option value="Large">Large</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-semibold">
                    Material
                  </label>
                  <select
                    name="specifications.material"
                    value={formData.specifications?.material || ""}
                    onChange={handleChange}
                    className="w-full mt-1 p-2 border border-slate-500 rounded-md bg-white"
                  >
                    <option value="">Select</option>
                    {MATERIAL.map((m) => (
                      <option key={m} value={m.toUpperCase()}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">
                    Select Color
                  </label>
                  <div
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full mt-1 p-2 border border-slate-500 rounded-md flex items-center justify-between cursor-pointer bg-white"
                  >
                    <span className={color ? "text-black text-xs" : "text-gray-400 text-xs"}>
                      {color ? color : "Select Color"}
                    </span>
                    <span>▼</span>
                  </div>
                  {isOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-[200px] overflow-y-auto left-0">
                      {colorOptions.map((item) => (
                        <div
                          key={item.name}
                          onClick={() => handleSelect(item.name)}
                          className="flex items-center gap-2 p-2 hover:bg-slate-50 border-b border-slate-50 cursor-pointer text-xs"
                        >
                          <div
                            style={{ background: item.code }}
                            className="w-4 h-4 rounded-full border border-slate-200 shrink-0"
                          />
                          <span>{item.name}</span>
                          {color === item.name.toUpperCase() && (
                            <span className="ml-auto text-blue-600 font-bold">✓</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Measurements Box */}
                <div className="col-span-2 md:col-span-4 grid grid-cols-3 gap-4 pt-4 border-t border-dashed border-slate-200">
                  <div>
                    <label className="text-xs text-slate-500 font-semibold">
                      Lens Width (mm)
                    </label>
                    <input
                      type="number"
                      name="specifications.dimensions.lensWidth"
                      value={formData.specifications?.dimensions?.lensWidth || ""}
                      onChange={handleChange}
                      className="w-full mt-1 p-2 border border-slate-300 rounded-md text-xs"
                      placeholder="e.g. 52"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-semibold">
                      Bridge Width (mm)
                    </label>
                    <input
                      type="number"
                      name="specifications.dimensions.bridgeWidth"
                      value={formData.specifications?.dimensions?.bridgeWidth || ""}
                      onChange={handleChange}
                      className="w-full mt-1 p-2 border border-slate-300 rounded-md text-xs"
                      placeholder="e.g. 18"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 font-semibold">
                      Temple Length (mm)
                    </label>
                    <input
                      type="number"
                      name="specifications.dimensions.templeLength"
                      value={formData.specifications?.dimensions?.templeLength || ""}
                      onChange={handleChange}
                      className="w-full mt-1 p-2 border border-slate-300 rounded-md text-xs"
                      placeholder="e.g. 145"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* METADATA & GST COMPLIANCE ROW */}
          <section className="flex flex-wrap xl:flex-nowrap items-end gap-4 border-t border-slate-100 pt-6 w-full">
            <div className="flex flex-col min-w-[140px] flex-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Target Gender
              </label>
              <select
                name="metadata.gender"
                value={formData.metadata?.gender || ""}
                onChange={handleChange}
                className="mt-1 p-2.5 border border-slate-500 rounded-lg bg-white text-sm outline-none focus:border-cyan-500"
                required
              >
                <option value="">Select</option>
                <option value="Men">Men</option>
                <option value="Women">Women</option>
                <option value="Unisex">Unisex</option>
                <option value="Kids">Kids</option>
              </select>
            </div>

            <div className="flex flex-col min-w-[140px] flex-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Warranty Period
              </label>
              <select
                name="metadata.warranty"
                value={formData.metadata?.warranty || ""}
                onChange={handleChange}
                className="mt-1 p-2.5 border border-slate-500 rounded-lg bg-white text-sm outline-none focus:border-cyan-500"
                required
              >
                <option value="">Select</option>
                <option value="No Warranty">No Warranty</option>
                <option value="6 Months">6 Months</option>
                <option value="1 Year">1 Year</option>
                <option value="2 Years">2 Years</option>
              </select>
            </div>

            <div className="flex flex-col min-w-[140px] flex-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Central GST (CGST %)
              </label>
              <select
                name="cgst"
                value={formData.cgst}
                onChange={handleChange}
                className="mt-1 p-2.5 border border-slate-500 rounded-lg bg-white text-sm font-mono font-bold outline-none focus:border-cyan-500"
              >
                {TAX_RATES.map((rate) => (
                  <option key={`cgst-${rate}`} value={rate}>
                    {rate}%
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col min-w-[140px] flex-1">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                State GST (SGST %)
              </label>
              <select
                name="sgst"
                value={formData.sgst}
                onChange={handleChange}
                className="mt-1 p-2.5 border border-slate-500 rounded-lg bg-white text-sm font-mono font-bold outline-none focus:border-cyan-500"
              >
                {TAX_RATES.map((rate) => (
                  <option key={`sgst-${rate}`} value={rate}>
                    {rate}%
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 border border-slate-200 p-2.5 rounded-lg bg-slate-50 shrink-0 h-[46px]">
              <label className="flex items-center gap-1.5 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  name="metadata.bestseller"
                  onChange={handleChange}
                  checked={formData.metadata?.bestseller || false}
                  className="w-4 h-4 rounded border-slate-500 text-cyan-600 focus:ring-0"
                />
                <span className="text-xs text-slate-700 font-bold group-hover:text-cyan-600 transition-colors">
                  Bestseller
                </span>
              </label>
              
              <label className="flex items-center gap-1.5 cursor-pointer group select-none">
                <input
                  type="checkbox"
                  name="metadata.newArrival"
                  onChange={handleChange}
                  checked={formData.metadata?.newArrival || false}
                  className="w-4 h-4 rounded border-slate-500 text-cyan-600 focus:ring-0"
                />
                <span className="text-xs text-slate-700 font-bold group-hover:text-cyan-600 transition-colors">
                  New Arrival
                </span>
              </label>
            </div>
          </section>

          <button
            type="submit"
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg active:scale-[0.98]"
          >
            Confirm and Add to Inventory Directory
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddProduct;