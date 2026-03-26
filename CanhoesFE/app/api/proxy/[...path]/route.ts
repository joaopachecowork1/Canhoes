import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";

/**
 * Proxy to the backend (avoids CORS) + injects Google id_token.
 *
 * Frontend auth: NextAuth (Google).
 * Backend auth: expects Authorization: Bearer <Google id_token>.
 *
 * Note: This proxy allows unauthenticated GET requests to public endpoints.
 */

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleProxyRequest(request, resolvedParams, "GET");
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleProxyRequest(request, resolvedParams, "POST");
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleProxyRequest(request, resolvedParams, "PUT");
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleProxyRequest(request, resolvedParams, "DELETE");
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const resolvedParams = await params;
  return handleProxyRequest(request, resolvedParams, "PATCH");
}

async function handleProxyRequest(request: NextRequest, params: { path: string[] }, method: string) {
  try {
    // Try to get idToken from JWT
    const token = await getToken({ req: request });
    let idToken = token?.idToken;
    
    // Fallback to server session
    if (!idToken) {
      const session = await getServerSession(authOptions);
      idToken = session?.idToken;
    }

    const path = params.path.join("/");
    const backendBase = process.env.CANHOES_API_URL || "http://localhost:5000";
    const backendUrl = `${backendBase}/api/${path}${request.nextUrl.search}`;

    // Build headers
    const headers = new Headers();
    
    // Add Authorization if we have idToken
    if (idToken) {
      headers.set("Authorization", `Bearer ${idToken}`);
    }

    // Forward content-type so backend can parse JSON or multipart properly.
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);

    let body: ArrayBuffer | undefined;
    if (method !== "GET" && method !== "DELETE") {
      body = await request.arrayBuffer();
    }

    console.log(`[Proxy] ${method} ${backendUrl}`, {
      hasToken: !!idToken,
      path,
    });

    const response = await fetch(backendUrl, {
      method,
      headers,
      body: body ?? undefined,
    });

    // 204 has no body by definition; passing a body causes NextResponse to throw.
    if (response.status === 204) {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Content-Type": response.headers.get("Content-Type") || "application/json",
        },
      });
    }

    const responseData = await response.text();
    return new NextResponse(responseData || null, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json",
      },
    });
  } catch (error) {
    console.error("[Proxy Error]", error);
    return NextResponse.json({ message: "Internal proxy error" }, { status: 500 });
  }
}
