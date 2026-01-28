import TermsAndConditions, {
  ITermsAndConditions,
} from "../../services/termsAndConditions.model";

export const getTerms = async (): Promise<ITermsAndConditions | null> => {
  return TermsAndConditions.findOne({ type: "terms" }).sort({ updatedAt: -1 });
};

export const getPrivacy = async (): Promise<ITermsAndConditions | null> => {
  return TermsAndConditions.findOne({ type: "privacy" }).sort({ updatedAt: -1 });
};
