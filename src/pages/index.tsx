import type {
  GetServerSideProps,
  InferGetServerSidePropsType,
} from "next";
import { signIn, signOut, useSession } from "next-auth/react";

import { GoogleAccountAvatar } from "@/components/auth/google-account-avatar";
import { isGoogleOAuthConfigured } from "@/modules/auth/infrastructure/oauth/google-oauth-config";
import { GOOGLE_OAUTH_SCOPES } from "@/modules/auth/infrastructure/oauth/google-oauth-scopes";
import { StoragePlayground } from "@/components/storage-playground/storage-playground";
import { getStorageBootstrap } from "@/modules/storage/application/queries/get-storage-bootstrap";
import type { StorageBootstrapResult } from "@/modules/storage/application/results/storage-bootstrap";

import styles from "./index.module.scss";

type HomePageProps = {
  bootstrap: StorageBootstrapResult;
};

export default function HomePage({
  bootstrap,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const isOAuthConfigured = bootstrap.authStatus === "configured";
  const { data: session, status } = useSession();
  const sessionUserName = session?.user?.name?.trim() || null;
  const sessionUserImage = session?.user?.image?.trim() || null;

  const handleGoogleAccountConnect = () => {
    if (!isOAuthConfigured) {
      return;
    }

    void signIn("google", {
      callbackUrl: "/",
    });
  };

  const handleGoogleAccountDisconnect = () => {
    void signOut({
      callbackUrl: "/",
    });
  };

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <div className={styles.topBar}>
          <GoogleAccountAvatar
            onConnect={handleGoogleAccountConnect}
            onDisconnect={handleGoogleAccountDisconnect}
            status={status}
            userImage={sessionUserImage}
            userName={sessionUserName}
          />
        </div>
        <StoragePlayground />
      </div>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<HomePageProps> = async () => {
  try {
    return {
      props: {
        bootstrap: getStorageBootstrap({
          isGoogleOAuthConfigured: isGoogleOAuthConfigured(),
          requiredScopes: GOOGLE_OAUTH_SCOPES,
        }),
      },
    };
  } catch {
    return {
      props: {
        bootstrap: getStorageBootstrap({
          isGoogleOAuthConfigured: false,
          requiredScopes: [],
        }),
      },
    };
  }
};
