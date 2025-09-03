// Shared UI components for CoursWeb applications

// Core utilities
export { cn } from "./lib/utils";

// All components
export * from "./components";

// Hooks
export * from "./hooks/use-mobile";

// Re-export commonly used UI libraries for consistency
export { cva, type VariantProps } from "class-variance-authority";
export { clsx } from "clsx";

// Re-export specific lucide-react icons to avoid conflicts
export {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  X,
  Check,
  Search,
  User,
  Settings,
  Home,
  Menu,
  Plus,
  Minus,
  Edit,
  Trash,
  Eye,
  EyeOff,
  Download,
  Upload,
  Mail,
  Phone,
  MapPin,
  Clock,
  Star,
  Heart,
  Share,
  Copy,
  ExternalLink,
  Info,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  MoreHorizontal,
  MoreVertical,
  PanelLeft,
} from "lucide-react";
