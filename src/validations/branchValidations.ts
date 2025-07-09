// branchValidations.ts
import * as yup from "yup";

export const createBranchSchema = yup.object({
  name: yup.string().min(2).max(100).required(),
});

export const updateBranchSchema = yup.object({
  name: yup.string().min(2).max(100),
});
