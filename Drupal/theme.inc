<?php
/**
 * @file
 *  Contains helper functions to build and override theme functions
 */

/**
 * implementing hook_theme()
 */
function acquia_theme($existing, $type, $theme, $path) {
  $path = drupal_get_path('module', 'acquia') . '/theme';
  $items = array(
	'acquia_iconfont' => array(
	  'variables' => array('class' => NULL),
	  'file' => 'includes/theme.inc',
	),
	'acquia_popup' => array(
	  'variables' => array('class' => NULL),
	  'file' => 'includes/theme.inc',
	),
	'acquia_prevnext' => array(
	  'variables' => array('node' => NULL),
	  'file' => 'includes/theme.inc',
	),
	'acquia_sep' => array(
	  'variables' => array('type' => 'hr'),
	  'file' => 'includes/theme.inc',
	),
	'acquia_local_video' => array(
	  'variables' => array('uri' => 'hr', 'options'),
	  'file' => 'includes/theme.inc',
	),
	'acquia_slider' => array(
	  'variables' => array('items' => array(), 'settings' => array()),
	  'template' => 'acquia-slider',
	  'path' => $path,
	),
	'acquia_carousel_slider' => array(
	  'variables' => array('items' => array(), 'settings' => array()),
	  'template' => 'acquia-carousel-slider',
	  'path' => $path,
	),
	'acquia_ajax_load_btn' => array(
	  'variables' => array('settings' => array()),
	  'template' => 'acquia-ajax-load-btn',
	  'path' => $path,
	),
	'acquia_share_links' => array(
	  'variables' => array('node' => array()),
	  'template' => 'acquia-share-links',
	  'path' => $path,
	),
	'acquia_default_avatar' => array(
	  'variables' => array(),
	  'template' => 'acquia-default-avatar',
	  'path' => $path,
	),
	'acquia_tags' => array(
	  'variables' => array('tags' => array()),
	  'template' => 'acquia-tags',
	  'path' => $path,
	),
	'acquia_preloader' => array(
	  'variables' => array(),
	  'template' => 'acquia-preloader',
	  'path' => $path,
	),
	'acquia_topbar_socials' => array(
	  'variables' => array('socials' => array()),
	  'file' => 'includes/theme.inc',
	),
	'acquia_topbar_contact_info' => array(
	  'variables' => array('info' => array()),
	  'file' => 'includes/theme.inc',
	),
	'acquia_media_feature' => array(
	  'variables' => array('type' => '', 'extra_class' => NULL, 'label' => NULL),
	  'file' => 'includes/theme.inc',
	),
	'image_entity_ac_carousel' => array(
	  'variables' => array(
		'images' => array(),
		'preview_style' => ACQUIA_CAROUSEL_PREVIEW_STYLE,
		'thumb_style' => ACQUIA_CAROUSEL_THUMB_STYLE,
		'attributes' => array(),
	  ),
	  'file' => 'includes/theme.inc',
	),
  );

  acquia_include('options');

  // share links
  foreach (array_keys(acquia_social_icons()) as $social) {
	$items[$social . '_share'] = array(
	  'variables' => array(
		't' => NULL,
		'link' => NULL,
		'excerpt' => NULL,
	  ),
	  'template' => 'acquia-'.$social.'-share',
	  'path' => $path . '/share',
	);
  }

  // tags view
  foreach (array_keys(acquia_tags_view()) as $view) {
	$items['acquia_tags_view_' . $view] = array(
	  'variables' => array(
		'item' => array(),
		'settings' => array(),
	  ),
	  'template' => 'acquia-tags-view-'.$view,
	  'path' => $path . '/tags',
	);
  }

  return $items;
}

/**
 * Returns HTML for a menu link and submenu.
 *
 * @param $variables
 *   An associative array containing:
 *   - element: Structured array data for a menu link.
 *
 * @ingroup themeable
 */
function acquia_preprocess_menu_link(&$variables) {
  $variables['element']['#attributes']['class'][] = 'menu-item';
}

/**
 * @TODO document here
 */
function acquia_preprocess_acquia_tags_view_list(&$vars){
  $tags = array();
  foreach($vars['tags'] as $tid => $tag) {
	if ($term = taxonomy_term_load($tid)) {
	  $uri = entity_uri('taxonomy_term', $term);
	  if (isset($tag->count))  {
		$uri['options']['html'] = TRUE;
		$uri['options']['attributes']['class'][] = 'l-' . $tag->count;
		$uri['options']['attributes']['title'] = $tag->description;
		$tag->name .= '<span>(' . $tag->count . ')<span>';
	  }
	  $tags[] = l($tag->name, $uri['path'] , $uri['options']);
	}
  }

  $vars['items'] = theme('item_list', array('items' => $tags, 'attributes' => array('class'=> array('ac-s-li', 'ac-li-bordered'))));
}

/**
 * @TODO document here
 */
function acquia_preprocess_acquia_tags_view_tagclouds(&$vars){
  acquia_include('taxonomy');
  if (isset($vars['vocabulary'])) {
	$delta = _ac_get_taxonomy_vid_by_name($vars['vocabulary']);
	if ($voc = taxonomy_vocabulary_load($delta)) {
	  $tags = tagclouds_get_tags(array($delta), variable_get('tagclouds_levels', 6), variable_get('tagclouds_block_tags_' . $delta, 12));
	  $tags = tagclouds_sort_tags($tags);
	  $vars['content'] = theme('tagclouds_weighted', array('terms' => $tags)); //return a chunk of 12 tags
	  if (count($tags) >= variable_get('tagclouds_block_tags_' . $delta, 12) && variable_get('tagclouds_block_tags_' . $delta, 12) > 0) {
		$vars['content'] .= theme('more_link', array('title' => t('more tags'), 'url' => "tagclouds/chunk/{$voc->vid}"));
	  }
	}
  }
}

/**
 * @TODO document here
 */
function acquia_preprocess_acquia_tags_view_tag(&$vars){
  $tags = array();
  foreach($vars['tags'] as $tid => $tag) {
	if ($term = taxonomy_term_load($tid)) {
	  $uri = entity_uri('taxonomy_term', $term);
	  if (isset($tag->count))  {
		$uri['options']['html'] = TRUE;
		$uri['options']['attributes']['class'][] = 'l-' . $tag->count;
		$uri['options']['attributes']['title'] = $tag->description;
	  }
	  $tags[] = l($tag->name, $uri['path'] , $uri['options']);
	}
  }

  $vars['items'] = theme('item_list', array('items' => $tags, 'attributes' => array('class'=> array('ac-s-li'))));
}

/**
 * @TODO document here
 */
function theme_acquia_media_feature($vars){
  $vars['type'] = isset($vars['type']) ? $vars['type'] : 'linked';
  $feature_attrs = array();
  $feature_attrs['class'] = isset($vars['extra_class']) ? (array)$vars['extra_class'] : array();

  switch ($vars['type']) {
	case 'link':
	  array_unshift($feature_attrs['class'], 'linked');
	  $label = isset($vars['label']) ? t($vars['label']) : t('view');
	  $title = isset($vars['title']) ? $vars['title'] : t('View Post');
	  return '<b'.drupal_attributes($feature_attrs).'><span>' .$label . '</span></b><span class="ac-tip">'.$title.'</span>';

	case 'like':
	  array_unshift($feature_attrs['class'], 'likes');
	  $label = isset($vars['label']) ? t($vars['label']) : t('like');
	  return '<b'.drupal_attributes($feature_attrs).'><span>' .$label . '</span></b>';

	case 'popup':
	  $label = isset($vars['label']) ? t($vars['label']) : in_array('video', $vars['extra_class']) ? t('watch') : t('zoom');
	  array_unshift($feature_attrs['class'], 'popup');
	  $title = isset($vars['title']) ? $vars['title'] : in_array('video', $vars['extra_class']) ? t('watch') : t('Zoom');
	  return '<b'.drupal_attributes($feature_attrs).'><span>' .$label . '</span></b><span class="ac-tip">'.$title.'</span>';
  }
}
/**
 * acquia topbar social icons
 */
function theme_acquia_topbar_socials($vars) {
  $out = '';
  if (isset($vars['socials']) && !empty($vars['socials'])) {
	$out .= '<section class="block ac-topbar-socials">';
	$out .= '<ul class="acquia-share-links ac-size-tiny ac-s-li">';
	foreach($vars['socials'] as $network => $url) {
	  $out .= '<li>' . l('<i class="font-icon icon-'.$network.'"></i>', $url, array('html' => TRUE, 'absolute' => TRUE, 'attributes' => array('title' => t($network)))) .'</li>';
	}
	$out .= '</ul>';
	$out .= '</section>';
  }
  return $out;
}

/**
 * acquia topbar contact info
 */
function theme_acquia_topbar_contact_info($vars) {
  $out = '';
  if (isset($vars['info']) && !empty($vars['info'])) {
	acquia_include('options');
	$info = $vars['info'];
	if (isset($info['skype']) && !empty($info['skype'])) {
	  $info['skype'] = '<a href="skype:'.$info['skype'].'?call">' .$info['skype'] .'</a>';
	}
	$items = array();
	foreach($info as $key => $title) {
	  $item = '<li class="ac-'.$key.'-detail detail">';
	  $item .= '	<span class="font-icon icon-'.$key.'"></span>';
	  $item .= '	'.$title;
	  $item .= '</li>';
	  $items[] = $item;
	}

	$out .= '<section class="block ac-topbar-contact-info">';
	$out .= '<ul class="ac-s-li">';
	$out .= implode('', $items);
	$out .= '</ul>';
	$out .= '</section>';
  }
  return $out;
}

/**
 * Theme Local videos
 */
function theme_acquia_local_video($vars) {
  acquia_include('utility');
  acquia_include('content');
  acquia_load_resources('video');

  $meta = file_get_mimetype($vars['uri']);
  $src	= file_create_url($vars['uri']);
  $type = substr( $meta, 0, strpos($meta, '/') );
  if ( $type != 'video' ) {
	return sprintf( '<a class="ac-embedded-video" href="%s">%s</a>', $src, $src);
  }

  $attributes['loop'] = isset($vars['options']['loop']) && $vars['options']['loop'] == TRUE ? TRUE : '';
  $attributes['autoplay'] = isset($vars['options']['autoplay']) && $vars['options']['autoplay'] == TRUE ? TRUE : '';
  $attributes['autoplay'] = isset($vars['options']['preload']) && $vars['options']['preload'] == TRUE ? TRUE : '';
  $attributes['poster'] = isset($vars['options']['poster']) && !empty($vars['options']['poster']) ? $vars['options']['poster'] : '';
  $attributes['id'] = isset($vars['options']['id']) && !empty($vars['options']['id']) ? $vars['options']['id'] : uniqid('ac-video-');
  $attributes['controls'] = 'controls';
  $attributes['style'] = array();

  $width = NULL;
  if (isset($vars['options']['width']) && !empty($vars['options']['width'])) {
	$attributes['style']['width'] = ac_check_unit($vars['options']['width']);
	$width = $attributes['style']['width'];
  }
  if (isset($vars['options']['height']) && !empty($vars['options']['height'])) {
	$attributes['style']['height'] = ac_check_unit($vars['options']['height']);
  }
  // @TODO add user input styles
  $attributes['style'] = acquia_style_arr_to_tag(	$attributes['style'] );

  foreach ($attributes as $attr => $val) {
	if ( empty($val) ) {
	  unset( $attributes[$attr] );
	}
  }

  // Wrapper Attributes
  $wrap_attrs['class'] = array('ac-l-media');
  //---------------------------------------
  if (!empty($vars['options']['class'])) {
	foreach (explode(' ', $vars['options']['class']) as $class) {
	  $wrap_attrs['class'][] = $class;
	}
  }
  $wrap_attrs['class'] = array_filter($wrap_attrs['class'], 'strlen');
  $wrap_attrs['class'] = implode(' ', $wrap_attrs['class']);
  //---------------------------------------


  $html  = "	<!--[if lt IE 9]><script>document.createElement('video');</script><![endif]-->\n";
  $html .= '	<video'.drupal_attributes($attributes).'>';
  $html .= '		'.sprintf( '<source type="%s" src="%s" />', $meta, $src );
  $html .= '		'.sprintf( '<a href="%1$s">%1$s</a>', $src );
  $html .= '	</video>';

  if (!empty($width)) {
	$html = sprintf( '<div style="width: %dpx; max-width: 100%%;">%s</div>', $width, $html );
  }

  $html  = '<div'.drupal_attributes($wrap_attrs).'>'.$html.'</div>';
  return $html;
}

/**
 *
 */
function theme_acquia_sep($vars) {
  return '<div class="ac-'.$vars['type'].'-sep"></div>';
}

/**
 *
 */
function theme_acquia_prevnext($vars) {
  $out = '';
  if (isset($vars['node'])) {
	acquia_include('utility');
	$prev_html = acquia_node_sibling('prev', $vars['node']);
	$next_html = acquia_node_sibling('next', $vars['node']);
	$out  = '<ul class="ac-prev-next clearfix">';
	$out .= !empty($prev_html) ? '<li>'.$prev_html.'</li>' : NULL;
	$out .= !empty($next_html) ? '<li>'.$next_html.'</li>' : NULL;
	$out .= '</ul>';
  }
  return $out;
}

/**
 * Outputs theme('acquia_iconfont')
 */
function theme_acquia_iconfont($vars) {
  acquia_include('content');
  acquia_include('fonts');
  $class = !empty($vars['class']) ? $vars['class'] : null;

  $vars+= array(
	'font' => 'fontello',
  );

  $classes = array();
  $classes[] = 'font-icon';
  $classes[] = isset($vars['font']) ? acquia_get_class_by_args(array('font'), $vars) : NULL;
  $classes[]= isset($vars['icon']) && !is_numeric($vars['icon']) ? acquia_fontello_glyph_get_code($vars['icon']) : NULL;

  //---------------------------------------
  if (!empty($class)) {
	$class = is_array($class) ? $class : explode(' ', $class);
	foreach ($class as $_class) {
	  $classes[] = $_class;
	}
  }
  $classes = array_filter($classes, 'strlen');
  $classes = implode(' ', $classes);
  //---------------------------------------

  $attributes['class'] = $classes;
  if (isset($vars['style'])) {
	$attributes['style'] = is_array($vars['style']) ? acquia_style_arr_to_tag($vars['style']) : $vars['style'];
  }

  $code = isset($vars['icon']) && is_numeric($vars['icon']) ? '&#' . $vars['icon'] : '';
  return '<span'.drupal_attributes($attributes).'>'.$code.'</span>';
}

/**
 * Theme function for displaying the popup trigger image in an imagefield.
 *
 * @param $path
 *   The path to the image to be displayed.
 * @param $alt
 *   The image alternative text.
 * @param $title
 *   The image title.
 * @param $attributes
 *   An array of image attributes, e.g. class name.
 * @return
 *   HTML output for displaying the image.
 */
function theme_acquia_popup($variables) {
  acquia_load_resources('popup');

  $path = isset($variables['path']) ? $variables['path'] : array();
  $item = isset($variables['item']) ? $variables['item'] : array();
  $item['caption'] = isset($item['caption']) ? $item['caption'] : '';

  $type = isset($variables['type']) ? $variables['type'] : 'icon';

  $extra_class = '';
  if (isset($variables['lightbox_video']) && !empty($variables['lightbox_video'])) {
	$path['path'] = file_create_url($variables['lightbox_video']);
	$path['options']['attributes']['class'][] = 'ac-popup-video';
	$extra_class = 'video';
	$title =  "Lunch Video";
  }else if (isset($item['uri'])){
	$path['options']['attributes']['class'][] = 'ac-popup-image';
	if (!isset($variables["lightbox_style"]) || empty($variables["lightbox_style"])) {
	  $path['path'] = file_create_url($item['uri']);
	} else {
	  $path['path'] = image_style_url($variables["lightbox_style"],  $item['uri']);
	}
	$extra_class = 'image';
	$title = "View Photo";
  }

  $path['options']['attributes']['class'][] = 'ac-popup';

  $path['options']['attributes']['title'] = isset($item['title']) ? $item['title'] : '';
  $path['options']['attributes']['data-ac-popup-caption'] = $item['caption'];

  // single feature
  if ($type == 'image' || $type == 'video') {
	$image_style = $variables['image_style'];
	return theme('image_formatter', array( 'item' => $item, 'path' => $path, 'image_style' => $image_style ) );
  }else{
	$path['options']['html'] = TRUE;
	$feature = theme('acquia_media_feature', array('type' => 'popup', 'extra_class' => array($extra_class)));
	return l($feature, $path['path'], $path['options']);
  }

}

/**
 * Preprocess hooks
 *------------------------------------------------*/
/**
 * Implements hook_preprocess_page().
 */
function acquia_preprocess_page(&$vars) {
  if (module_exists('context_node')) {
	$context = context_get('context', "context_node");
	if (isset($context->name)) {
	  $vars['attributes_array']['class'][] = $context->name;
	}
  }

  // 404 error page template
  $status = drupal_get_http_header("status");
  if ($status == "404 Not Found") {
	$vars['theme_hook_suggestions'][] = 'page__404';
  }

  // You can use preprocess hooks to modify the variables before they are passed
  // to the theme function or template file.
  $vars['attributes_array']['id'] = 'page';

  // Hero Attributes
  if (!isset($vars['hero_attrs'])) {
	$vars['hero_attrs'] = array('class' => 'l-hero l-hero-'. acquia_variable_get('hero_style'));
  }
}

/**
 * Implements hook_preprocess_block().
 */
function acquia_preprocess_block(&$vars) {
  // Add dropdownmenu functionality to main menu
  if (!empty($vars['block_html_id']) && strstr($vars['block_html_id'], 'system-main-menu')) {
	$vars['content_attributes_array']['class'][] = 'dropdownmenu';
	$vars['content_attributes_array']['class'][] = 'main-menu';
  }else {
	$vars['title_attributes_array']['class'][] = 'ac-margin-default';
  }

  $vars['title_attributes_array']['class'][] = 'ac-bordered';

  switch ($vars['block']->delta) {
	case 'main-menu':
	  $vars['block']->subject = '';
	  break;
  }
}

/**
 * Implements hook_template_preprocess_comment_wrapper().
 */
function acquia_preprocess_comment_wrapper(&$vars) {
  $vars['attributes_array']['class'][] = 'ac-fancy-form';
}

/**
 * Implements hook_preprocess_region().
 */
function acquia_preprocess_region(&$vars) {
  // clearfix
  $vars['classes_array'][] = 'clearfix';
}


/**
 * Implements hook_template_preprocess_comment_wrapper().
 */
function acquia_preprocess_comment(&$vars) {
  $vars['created_ago'] = theme('html5_tools_time', array('date' => format_interval((time() -$vars['comment']->changed) , 2) . t(' ago'), 'isodate' => format_date($vars['comment']->changed, 'html5_tools_iso8601')));
  // Date
  //if ($vars['comment']->uid !=0) {
  //	$vars['author'] = l($vars['comment']->name , 'user/'.$vars['comment']->uid, array('attributes' => array('class' => array('username'))));
  //}
  //else {
  //	$vars['author'] = '<span class="username">' .$vars['comment']->name .'</span>';
  //}
  if ($vars['comment']->uid !=0) {
	$vars['author'] = l($vars['comment']->name, 'user/'.$vars['comment']->uid , array('attributes' => array('class' => 'username')));
  }
  else {
	$vars['author'] = '<span class="username">' .$vars['comment']->name .'</span>';
  }
  $vars['created'] = format_date($vars['comment']->created , "custom", "F jS, Y");
  //$vars['attributes_array']['class'][] = 'ac-table';
}


/**
 * Implements hook_preprocess_node().
 */
function acquia_preprocess_node(&$vars) {
  if($vars['view_mode'] == 'teaser') {
	$vars['theme_hook_suggestions'][] = 'node__teaser';
	$vars['theme_hook_suggestions'][] = 'node__' . $vars['node']->type . '__teaser';

	// add DiamondLayers styles to elements
	acquia_include('utility');

	// read more
	$vars['read_more'] = l('<span class="icon-readmore"></span>' . t('read more'), 'node/' . $vars['node']->nid, array('html' => TRUE));
  }

  else if ($vars['view_mode'] == 'full') {
	if (isset($vars['node']->nodemeta['node_layout']) && !empty($vars['node']->nodemeta['node_layout'])) {
	  $context_mn = $vars['node']->nodemeta['node_layout'];
	}else{
	  $context_mn = variable_get('ac_styles_node_' . $vars['node']->type .'_default_context',
		acquia_variable_get("node_default_layout", "second-sidebar"));
	}
	$vars['context'] = $context_mn;
  }
  // Date
  $vars['date'] = theme('html5_tools_time', array('date' => format_date($vars['node']->created, "custom", acquia_variable_get('date_format', 'F jS, Y')), 'isodate' => format_date($vars['node']->created, 'html5_tools_iso8601')));

  // author
  $vars['author'] = theme('username', array('account' => user_load($vars['node']->uid)));

  // comment_count_formatted
  $vars['comment_count'] = isset($vars['comment_count']) ? $vars['comment_count'] : 0;
  $vars['comment_count_formatted'] = l(t('@count comments', array('@count' => $vars['comment_count'])), $vars['node_url'], array('external' => TRUE,'fragment' => 'comments'));

  // User Picture
  if (isset($vars['picture']) && $vars['picture'] == 0) {
	$vars['user_picture'] = theme('acquia_default_avatar');
  }

  $node_top = block_get_blocks_by_region('node_top');
  $node_bottom = block_get_blocks_by_region('node_bottom');
  $vars['node_top'] = $node_top ? $node_top : false;
  $vars['node_bottom'] = $node_bottom ? $node_bottom : false;
}

/**
 * @TODO document here
 */
function acquia_preprocess_acquia_slider(&$vars) {
  if (isset($vars['items']) && !empty($vars['items'])) {
	acquia_load_resources('minslider');
	$vars['wrap_attrs'] = array();
	$vars['wrap_attrs']['class'] = array('ac-min-slider');
	$vars['wrap_attrs']['class'][] = isset($vars['style']) && $vars['style'] == 'dark' ? 'ac-darkstyle' : 'ac-lightstyle';
	// @todo settings
	$vars['wrap_attrs']['data-auto'] = isset($vars['settings']['auto']) ? $vars['settings']['auto'] : 'true';
	$vars['wrap_attrs']['data-pager'] = isset($vars['settings']['pager']) ? $vars['settings']['pager'] : 'true';
	$vars['wrap_attrs']['data-nav'] = isset($vars['settings']['nav']) ? $vars['settings']['nav'] : 'false';

	if (isset($vars['settings']['speed'])) {
	  $vars['wrap_attrs']['data-speed'] = $vars['settings']['speed'];
	}
	if (isset($vars['settings']['timeout'])) {
	  $vars['wrap_attrs']['data-timeout'] = $vars['settings']['timeout'];
	}
  }
}

/**
 * @TODO document here
 */
function acquia_preprocess_acquia_carousel_slider(&$vars) {
  acquia_include('slider');
  acquia_load_resources('carousel');
  acquia_carousel_slider_prepeare_vars($vars);
}

/**
 * Preprocess portfolio tags
 */
function acquia_preprocess_acquia_tags(&$vars){
  $vars['tags'] = !empty($vars['tags']) ? (array) $vars['tags'] : array();
  $tags = array();
  foreach($vars['tags'] as $delta => $tag) {
	$tags[] = l(t($tag), 'taxonomy/term/' . $delta, array('absolute' => TRUE));
  }
  $vars['tags'] = $tags;
}

/**
 * @TODO document here
 */
function acquia_preprocess_acquia_ajax_load_btn(&$vars) {
  acquia_include('utility');
  $vars['title'] = t('Load more');
}

/**
 * @TODO document here
 */
function acquia_preprocess_acquia_share_links(&$vars) {
  $vars['items'] = array();
  if (isset($vars['node'])){
	acquia_include('options');
	$socials = acquia_social_icons();
	$enabled = isset($vars['socials']) ? $vars['socials'] : array();
	if (!empty($enabled)) {
	  acquia_include('utility');
	  acquia_add_tooltip_libs_by_type('tooltip');
	  $share_vars = array();
	  $share_vars['link'] = url('node/' . $vars['node']->nid, array('absolute' => TRUE));
	  $share_vars['node_title'] = t($vars['node']->title);
	  $share_vars['excerpt'] = isset($vars['excerpt']) ? $vars['excerpt'] : '';
	  foreach ($enabled as $social) {
		$share_vars['title'] = $socials[$social];
		$vars['items'][$social] = theme($social . '_share', $share_vars);
	  }
	}
  }
}

/**
 * Preprocess function for theme('media_vimeo_video').
 */
function acquia_preprocess_media_youtube_video(&$variables) {
  $variables['options']['captions'] = isset($variables['options']['captions']) ? $variables['options']['captions'] : '';
}
/**
 * Preprocess function for theme('media_vimeo_video').
 */
function acquia_preprocess_media_vimeo_video(&$variables) {
  module_load_include('inc', 'media_vimeo', 'includes/media_vimeo.variables');
  // Build the URL for display.
  $uri = $variables['uri'];
  $wrapper = file_stream_wrapper_get_instance_by_uri($uri);
  if (empty($uri) || !is_object($wrapper)) {return;}
  $parts = $wrapper->get_parameters();
  $variables['video_id'] = check_plain($parts['v']);

  $variables['options']['width'] = isset($variables['width']) ? $variables['width'] : media_vimeo_variable_get('width');
  $variables['options']['height'] = isset($variables['height']) ? $variables['height'] : media_vimeo_variable_get('height');
  $variables['options']['autoplay'] = isset($variables['autoplay']) ? $variables['autoplay'] : media_vimeo_variable_get('autoplay');
  $variables['options']['fullscreen'] = isset($variables['fullscreen']) ? $variables['fullscreen'] : media_vimeo_variable_get('fullscreen');
  $variables['options']['autoplay'] = $variables['autoplay'] ? 1 : 0;
  $variables['options']['fullscreen'] = $variables['options']['fullscreen'] ? 'true' : 'false';

  $variables['wrapper_id'] = 'media_vimeo_' . $variables['video_id'] . '_' . $variables['id'];

  // For users with JavaScript, these object and embed tags will be replaced
  // by an iframe, so that we can support users without Flash.
  $variables['output'] = '<iframe src="http://player.vimeo.com/video/'.$variables['video_id'].'" width="'.$variables['options']['width'].'" height="'.$variables['options']['height'].'" allowfullscreen="' .$variables['options']['fullscreen']. '"></iframe>';

  // Pass the settings to replace the object tag with an iframe.
  $settings = array(
	'media_vimeo' => array(
	  $variables['wrapper_id'] => array(
		'width' => $variables['options']['width'],
		'height' => $variables['options']['height'],
		'video_id' => $variables['video_id'],
		'fullscreen' => $variables['options']['fullscreen'],
		'id' => $variables['wrapper_id'] .'_iframe',
		'options' => array(),
	  ),
	),
  );
  if ($variables['autoplay']) {
	$settings['media_vimeo'][$variables['wrapper_id']]['options'] += array(
	  'autoplay' => $variables['autoplay'],
	);
  }

  if (isset($variables['simple_style']) && $variables['simple_style'] == TRUE) {
	$settings['media_vimeo'][$variables['wrapper_id']]['options'] += array(
	  'title' => "false",
	  'byline' =>  "false",
	  'portrait' =>  "false",
	);
  }

  drupal_add_js($settings, 'setting');
  drupal_add_js(drupal_get_path('module', 'media_vimeo') . '/js/media_vimeo.js');
  drupal_add_css(drupal_get_path('module', 'media_vimeo') . '/css/media_vimeo.css');
  drupal_add_js(drupal_get_path('module', 'media_vimeo') . '/js/flash_detect_min.js');
}
/**
 * Alter theme from acquia module
 *------------------------------------------------*/
/**
 * Implements hook_theme_registry_alter
 */
function acquia_theme_registry_alter(&$theme_registry) {
  // list of themes to override from acquia module
  $module_overrides = array('form_element', 'fieldset', 'pager_link', 'feed_icon');
  $theme_path = drupal_get_path('module', 'acquia') . '/includes/theme.inc';
  foreach ($module_overrides as $theme) {
	// alter form elements theme registry
	$theme_registry[$theme]['function'] = 'acquia_theme_' . $theme;
	$theme_registry[$theme]['includes'][] = $theme_path;
  }
}

/**
 * Override theme function
 */
function acquia_theme_feed_icon($variables) {
  $text = t('Subscribe to !feed-title', array('!feed-title' => $variables['title']));
  $icon = theme('acquia_iconfont', array('icon' => 'rss'));

  $attributes = array();
  $attributes['title'] = $text;
  $attributes['class'][] = 'rss-syndicate';
  $attributes['class'][] = 'ac-animate';
  // Animate data
  $attributes += acquia_get_anim_data_by_attrs(array('animate' => 'fadeIn'));

  return l($icon, $variables['url'], array('html' => TRUE, 'attributes' => $attributes));
}

/**
 *
 */
function acquia_theme_form_element($variables) {
  $element = &$variables['element'];
  if (!isset($element['#type'])) {
	return;
  }
  $types = array('select', 'textfield', 'file', 'textarea', 'managed_file', 'radios', 'password');

  // This function is invoked as theme wrapper, but the rendered form element
  // may not necessarily have been processed by form_builder().
  $element += array(
	'#title_display' => 'before',
  );

  // Add element #id for #type 'item'.
  if (isset($element['#markup']) && !empty($element['#id'])) {
	$attributes['id'] = $element['#id'];
  }
  // Add element's #type and #name as class to aid with JS/CSS selectors.
  $attributes['class'] = array('form-item');
  if (!empty($element['#type'])) {
	$attributes['class'][] = 'form-type-' . strtr($element['#type'], '_', '-');
  }
  if (!empty($element['#name'])) {
	$attributes['class'][] = 'form-item-' . strtr($element['#name'], array(' ' => '-', '_' => '-', '[' => '-', ']' => ''));
  }
  // Add a class for disabled elements to facilitate cross-browser styling.
  if (!empty($element['#attributes']['disabled'])) {
	$attributes['class'][] = 'form-disabled';
  }
  $output = '<div' . drupal_attributes($attributes) . '>' . "\n";

  // If #title is not set, we don't display any label or required marker.
  if (!isset($element['#title'])) {
	$element['#title_display'] = 'none';
  }else{
	$label = theme('form_element_label', $variables);
  }

  $prefix = isset($element['#field_prefix']) ? '<span class="field-prefix">' . $element['#field_prefix'] . '</span> ' : '';
  $suffix = isset($element['#field_suffix']) ? ' <span class="field-suffix">' . $element['#field_suffix'] . '</span>' : '';

  if (in_array($element['#type'], $types)) {
	$element['#children'] = '<div class="element-inner"><div class="el">' . $element['#children'];
	$label = isset($label) ? '<div class="form-label">' .$label .'</div>' : '';
  }

  switch ($element['#title_display']) {
	case 'before':
	case 'invisible':
	  $output .= ' ' . $label;
	  $output .= ' ' . $prefix . $element['#children'] . $suffix . "\n";
	  break;

	case 'after':
	  $output .= ' ' . $prefix . $element['#children'] . $suffix;
	  $output .= ' ' . $label . "\n";
	  break;

	case 'none':
	case 'attribute':
	  // Output no label and no required marker, only the children.
	  $output .= ' ' . $prefix . $element['#children'] . $suffix . "\n";
	  break;
  }

  if (in_array($element['#type'], $types)) {
	$element['#description'] = isset($element['#description']) ? $element['#description'] : '';
	$output .= '</div><div class="description">' . $element['#description'] . "</div></div>\n";
  }

  if (isset($element['#full_description'])) {
	$output .= '<div class="full-description">' . $element['#full_description'] . "</div>\n";
  }
  $output .= "</div>\n";

  return $output;
}


/**
 * Returns HTML for a fieldset form element and its children.
 *
 * @param $variables
 *   An associative array containing:
 *   - element: An associative array containing the properties of the element.
 *     Properties used: #attributes, #children, #collapsed, #collapsible,
 *     #description, #id, #title, #value.
 *
 * @ingroup themeable
 */
function acquia_theme_fieldset($variables) {
  $element = $variables['element'];
  element_set_attributes($element, array('id'));
  _form_set_class($element, array('form-wrapper'));

  $output = '<fieldset' . drupal_attributes($element['#attributes']) . '>';
  if (!empty($element['#title'])) {
	// Always wrap fieldset legends in a SPAN for CSS positioning.
	$output .= '<legend><span class="fieldset-legend">' . theme('acquia_iconfont') . $element['#title'] . '</span></legend>';
  }
  $output .= '<div class="fieldset-wrapper">';
  if (!empty($element['#description'])) {
	$output .= '<div class="fieldset-description">' . $element['#description'] . '</div>';
  }
  $output .= $element['#children'];
  if (isset($element['#value'])) {
	$output .= $element['#value'];
  }
  $output .= '</div>';
  $output .= "</fieldset>\n";
  return $output;
}

/**
 * Returns HTML for a link to a specific query result page.
 *
 * @param $variables
 *   An associative array containing:
 *   - text: The link text. Also used to figure out the title attribute of the
 *     link, if it is not provided in $variables['attributes']['title']; in
 *     this case, $variables['text'] must be one of the standard pager link
 *     text strings that would be generated by the pager theme functions, such
 *     as a number or t('� first').
 *   - page_new: The first result to display on the linked page.
 *   - element: An optional integer to distinguish between multiple pagers on
 *     one page.
 *   - parameters: An associative array of query string parameters to append to
 *     the pager link.
 *   - attributes: An associative array of HTML attributes to apply to the
 *     pager link.
 *
 * @see theme_pager()
 *
 * @ingroup themeable
 */
function acquia_theme_pager_link($variables) {
  $text = $variables['text'];
  $page_new = $variables['page_new'];
  $element = $variables['element'];
  $parameters = $variables['parameters'];
  $attributes = $variables['attributes'];

  $page = isset($_GET['page']) ? $_GET['page'] : '';
  if ($new_page = implode(',', pager_load_array($page_new[$element], $element, explode(',', $page)))) {
	$parameters['page'] = $new_page;
  }

  $query = array();
  if (count($parameters)) {
	$query = drupal_get_query_parameters($parameters, array());
  }
  if ($query_pager = pager_get_query_parameters()) {
	$query = array_merge($query, $query_pager);
  }

  // Set each pager link title
  if (!isset($attributes['title'])) {
	static $titles = NULL;
	if (!isset($titles)) {
	  $titles = array(
		t('� first') => t('Go to first page'),
		t('� previous') => t('Go to previous page'),
		t('next �') => t('Go to next page'),
		t('last �') => t('Go to last page'),
	  );
	}
	if (isset($titles[$text])) {
	  $attributes['title'] = $titles[$text];
	}
	elseif (is_numeric($text)) {
	  $attributes['title'] = t('Go to page #@number', array('@number' => $text));
	}
  }

  if (strstr($text, t('first'))) {
	$text = '<span class="icon-angle-double-left"></span>'.t('first');
  }elseif(strstr($text, t('previous'))) {
	$text = '<span class="icon-angle-left"></span>'.t('previous');
  }elseif(strstr($text, t('next'))) {
	$text = t('next') . '<span class="icon-angle-right"></span>';
  }elseif(strstr($text, t('last'))) {
	$text = t('last') . '<span class="icon-angle-double-right"></span>';
  }

  // @todo l() cannot be used here, since it adds an 'active' class based on the
  //   path only (which is always the current path for pager links). Apparently,
  //   none of the pager links is active at any time - but it should still be
  //   possible to use l() here.
  // @see http://drupal.org/node/1410574
  $attributes['href'] = url($_GET['q'], array('query' => $query));
  return '<a' . drupal_attributes($attributes) . '><span>' . $text . '</span></a>';
}

/*
 * @todo Document here
 */
function ac_check_unit($str) {
  if (!strstr($str, 'px') && !strstr($str, '%') && !strstr($str, 'auto')) {
	return $str . 'px';
  } else {
	return $str;
  }
}

/*
 * @todo Document here
 */
function acquia_count_comments($var){
  return isset($var['#comment']);
}


/*
 * @todo Document here
 */
function acquia_filter_blocks($var){
  return isset($var['#markup']);
}


/**
 * A preprocess function for our theme('flag'). It generates the
 * variables needed there.
 *
 * The $variables array initially contains the following arguments:
 * - $flag
 * - $action
 * - $entity_id
 * - $after_flagging
 * - $errors
 * - $needs_wrapping_element
 *
 * See 'flag.tpl.php' for their documentation.
 */
function acquia_preprocess_flag(&$vars) {
  if (isset($vars['flag']->name)) {
	$entity_id = $vars['entity_id'];
	$vars['flag_classes_array'][] = 'ac-button';
	$vars['flag_classes_array'][] = 'ac-style-sw';
	$vars['flag_classes_array'][] = 'ac-type-sw';
	$vars['flag_classes_array'][] = 'flag-like';
	$vars['flag_classes_array'][] = 'flag-' . $vars['flag']->name . '-' . $entity_id;
	$vars['flag_data_array']['data-flag'] = $vars['flag']->name;
  }
}


/**
 * Theme carousel image field handler
 * @param $vars
 */
function theme_image_entity_ac_carousel($vars){
  $settings = $vars['attributes'];
  $settings['preview'] = array(
	'cols' => 1,
	'style' => $vars['preview_style'],
	'lightbox' => TRUE,
	'lightbox_style' => NULL,
  );

  $settings['thumb'] = array(
	'cols' => 3,
	'style' => $vars['thumb_style'],
  );

  // Full width style
  if (isset($vars['context']) && in_array($vars['context'], array('no-sidebars', 'fullwidth'))) {
	$settings['carousel_type'] = 'vertical';
  }

  return theme('acquia_carousel_slider', array('items' => $vars['images'], 'settings' => $settings));
}
