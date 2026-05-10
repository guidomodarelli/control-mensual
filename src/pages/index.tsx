import type { GetServerSideProps, GetServerSidePropsContext } from "next";

export default function HomePageRedirect() {
  return null;
}

function getRedirectDestination(context: GetServerSidePropsContext): string {
  const monthQuery = Array.isArray(context.query.month)
    ? context.query.month[0]
    : context.query.month;
  const normalizedMonth = monthQuery?.trim();

  return normalizedMonth ? `/gastos?month=${encodeURIComponent(normalizedMonth)}` : "/gastos";
}

export const getServerSideProps: GetServerSideProps = async (
  context,
) => ({
  redirect: {
    destination: getRedirectDestination(context),
    permanent: false,
  },
});
