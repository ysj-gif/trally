using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.AspNetCore.StaticFiles;

var builder = WebApplication.CreateBuilder(args);

// 응답 압축 설정
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[]
    {
        "text/css",
        "application/javascript",
        "text/markdown",
        "application/json"
    });
});

var app = builder.Build();

// 응답 압축 사용
app.UseResponseCompression();

// MIME 타입 설정 (.md 파일 지원)
var provider = new FileExtensionContentTypeProvider();
provider.Mappings[".md"] = "text/markdown";

// 정적 파일 제공 활성화 (캐싱 포함)
app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = provider,
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.Append("Cache-Control", "public,max-age=86400");
    }
});

// 기본 라우트 제거 - 정적 파일만 제공
// app.MapGet("/", () => "TRally - 토론 모임 웹사이트");

app.Run();