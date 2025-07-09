// userValidations.ts
import { UserRole } from "@/constants/roles";
import * as yup from "yup";


export const updateUserSchema = yup.object({
  username: yup.string().min(3).max(50),
  password: yup.string().min(8),
});

export const updateRoleSchema = yup.object({
  role: yup.string().oneOf(Object.values(UserRole)).required(),
});
