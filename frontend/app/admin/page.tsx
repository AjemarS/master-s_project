import { useRouter } from "next/navigation";

const AdminDashboard = () => {
  const router = useRouter();
  router.push("/admin/summary");
};

export default AdminDashboard;
