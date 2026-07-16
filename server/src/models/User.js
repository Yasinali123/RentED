import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    collegeId: {
      type: String,
      required: true,
      trim: true,
    },
    verifiedCollegeId: {
      type: Boolean,
      default: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
      default: "India",
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    institutionType: {
      type: String,
      enum: ["Engineering", "Medical", "Law", "Commerce", "School", "Other"],
      required: true,
    },
    collegeName: {
      type: String,
      required: true,
      trim: true,
    },
    campus: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    geometry: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    ratingsAverage: {
      type: Number,
      default: 0,
    },
    ratingsCount: {
      type: Number,
      default: 0,
    },
    // Wallet balance used for online payments (COD does not debit)
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    role: {
      type: String,
      enum: ["student", "seller", "poc", "admin"],
      default: "student",
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    isPocApproved: {
      type: Boolean,
      default: false,
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Item",
      },
    ],
    membership: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
    },
    membershipExpiresAt: {
      type: Date,
      default: null,
    },
    username: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    course: {
      type: String,
      default: "",
    },
    studentId: {
      type: String,
      default: "",
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    notifications: {
      type: Map,
      of: Boolean,
      default: {
        orderUpdates: true,
        deliveryUpdates: true,
        rentalDue: true,
        returnReminder: true,
        messages: true,
        promotions: false,
        pgUpdates: true,
        priceDrops: true,
        newListingsNearMe: true,
        emailNotifications: true,
        pushNotifications: true,
        smsNotifications: false,
      },
    },
    preferredDistance: {
      type: String,
      default: "Same City",
    },
    academicProfile: {
      course: { type: String, default: "" },
      department: { type: String, default: "" },
      semester: { type: String, default: "" },
    },
    appearance: {
      theme: { type: String, default: "system" },
      language: { type: String, default: "en" },
      fontSize: { type: String, default: "medium" },
    },
    deliveryPreferences: {
      defaultPickupLocation: { type: String, default: "" },
      hostelAddress: { type: String, default: "" },
      homeAddress: { type: String, default: "" },
      preferredDeliveryTime: { type: String, default: "Anytime" },
    },
    rentalPreferences: {
      preferredDuration: { type: String, default: "1 Month" },
      autoReturnReminder: { type: Boolean, default: true },
      autoRenew: { type: Boolean, default: false },
    },
    marketplacePreferences: {
      showSameCollegeFirst: { type: Boolean, default: true },
      showSameCity: { type: Boolean, default: true },
      showNearbyColleges: { type: Boolean, default: true },
      showAllIndia: { type: Boolean, default: false },
    },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);

export default User;

