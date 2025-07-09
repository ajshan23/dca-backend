import Joi from "joi";

export const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required(),
});

export const createUserSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid("user", "admin"),
});

export const updateUserSchema = Joi.object({
  username: Joi.string().min(3).max(50),
  password: Joi.string().min(8),
});
