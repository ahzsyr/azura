import {
  Award,
  BarChart3,
  Bus,
  Car,
  CheckCircle,
  Clock,
  Compass,
  Globe,
  Headphones,
  Heart,
  Hotel,
  Lock,
  Plane,
  Shield,
  Star,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const MARKETING_ICON_OPTIONS = [
  { value: "shield", label: "Shield" },
  { value: "award", label: "Award" },
  { value: "star", label: "Star" },
  { value: "check", label: "Check" },
  { value: "heart", label: "Heart" },
  { value: "clock", label: "Clock" },
  { value: "headphones", label: "Headphones" },
  { value: "globe", label: "Globe" },
  { value: "lock", label: "Lock" },
  { value: "users", label: "Users" },
  { value: "trending", label: "Trending" },
  { value: "zap", label: "Zap" },
  { value: "chart", label: "Chart" },
  { value: "bus", label: "Bus" },
  { value: "car", label: "Car" },
  { value: "compass", label: "Compass" },
  { value: "hotel", label: "Hotel" },
  { value: "plane", label: "Plane" },
] as const;

const iconMap: Record<string, LucideIcon> = {
  shield: Shield,
  award: Award,
  star: Star,
  check: CheckCircle,
  heart: Heart,
  clock: Clock,
  headphones: Headphones,
  globe: Globe,
  lock: Lock,
  users: Users,
  trending: TrendingUp,
  zap: Zap,
  chart: BarChart3,
  bus: Bus,
  car: Car,
  compass: Compass,
  hotel: Hotel,
  plane: Plane,
};

export function resolveMarketingIcon(name?: string): LucideIcon {
  if (!name) return Compass;
  return iconMap[name] ?? Compass;
}
